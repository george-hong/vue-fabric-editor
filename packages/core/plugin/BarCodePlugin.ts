/*
 * @Author: 秦少卫
 * @Date: 2024-06-06 14:12:24
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-06-07 21:24:56
 * @Description: 条形码生成工具
 */

import { fabric } from 'fabric';
import JsBarcode from 'jsbarcode';
import type { IEditor, IPluginTempl } from '@kuaitu/core';

type IPlugin = Pick<BarCodePlugin, 'addBarcode' | 'setBarcode' | 'getBarcodeTypes'>;

declare module '@kuaitu/core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface IEditor extends IPlugin {}
}

// 条形码生成参数
// https://github.com/lindell/JsBarcode/wiki/Options

enum CodeType {
  CODE128 = 'CODE128',
  EAN8 = 'EAN8',
  EAN13 = 'EAN13',
  ITF14 = 'ITF14',
  codabar = 'codabar',
  pharmacode = 'pharmacode',
}

class BarCodePlugin implements IPluginTempl {
  static pluginName = 'BarCodePlugin';
  static apis = ['addBarcode', 'setBarcode', 'getBarcodeTypes'];
  constructor(public canvas: fabric.Canvas, public editor: IEditor) {}

  async hookTransform(object: any) {
    if (object.extensionType === 'barcode') {
      console.log('in trans');
      const url = await this._getBase64Str(object.extension);
      object.src = url;
    }
  }
  async _getBase64Str(option: any): Promise<string> {
    // 获取 canvas 的缩放比例，用于提高绘制分辨率
    const zoom = this.canvas.getZoom() || 1;
    const devicePixelRatio = window.devicePixelRatio || 1;
    // 使用 zoom 和 devicePixelRatio 的乘积作为缩放因子
    const scale = zoom * devicePixelRatio;
    
    // 必须使用命名空间的svg元素才能正确生成barcode string
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    // 排除文本相关参数，只传递条形码生成所需的参数
    const {
      fontSize,
      textAlign,
      textPosition,
      displayValue,
      ...barcodeOptions
    } = option;
    
    // 生成不包含文本的条形码 SVG
    JsBarcode(svg, option.value, {
      ...barcodeOptions,
      displayValue: false, // 明确禁用 JsBarcode 的文本显示
    });
    
    const svgStr = new XMLSerializer().serializeToString(svg);
    const svgUrl = `data:image/svg+xml;base64,` + btoa(svgStr);
    
    // 如果不需要显示文本，直接返回 SVG URL
    if (!displayValue) {
      return svgUrl;
    }
    
    // 将 SVG 转换为图片，使用高分辨率
    // 先加载原始 SVG 获取尺寸
    const tempImg = await this._loadImage(svgUrl);
    const originalBarcodeWidth = tempImg.naturalWidth || tempImg.width;
    const originalBarcodeHeight = tempImg.naturalHeight || tempImg.height;
    
    // 创建高分辨率 canvas 渲染 SVG
    const svgImage = await this._loadImageToCanvas(svgUrl, scale);
    
    // 根据条形码的原始宽度和缩放比例创建文本 canvas
    const textCanvas = this._drawText(option.value, {
      fontSize: fontSize || 12,
      textAlign: textAlign || 'center',
      boxWidth: originalBarcodeWidth,
      scale: scale,
    });
    
    // 合并条形码和文本，使用高分辨率
    const mergedCanvas = this._mergeBarcodeAndText(
      svgImage,
      textCanvas,
      textPosition || 'bottom',
      scale,
      option.height // 传入目标高度
    );
    
    // 返回合并后的 base64
    return mergedCanvas.toDataURL('image/png');
  }
  
  // 加载图片的辅助方法
  private _loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }
  
  // 将 SVG 加载到高分辨率 canvas
  private _loadImageToCanvas(url: string, scale: number): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 canvas 上下文'));
          return;
        }
        
        // 设置高分辨率尺寸
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;
        
        canvas.width = originalWidth * scale;
        canvas.height = originalHeight * scale;
        
        // 使用高质量缩放
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 绘制图片到高分辨率 canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  
  // 在 canvas 上绘制文本
  private _drawText(
    text: string,
    options: { fontSize: number; textAlign: string; boxWidth: number; scale: number }
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建 canvas 上下文');
    }
    
    // 根据缩放比例设置 canvas 的实际尺寸
    const scaledWidth = options.boxWidth * options.scale;
    const scaledFontSize = options.fontSize * options.scale;
    const textHeight = scaledFontSize;
    const padding = 4 * options.scale;
    
    // 设置 canvas 的实际尺寸（高分辨率）
    canvas.width = scaledWidth;
    canvas.height = textHeight + padding;
    
    // 设置 canvas 的显示尺寸（CSS 尺寸）
    canvas.style.width = `${options.boxWidth}px`;
    canvas.style.height = `${(textHeight + padding) / options.scale}px`;
    
    // 缩放上下文以匹配高分辨率
    ctx.scale(options.scale, options.scale);
    
    // 设置字体（使用原始尺寸，因为已经通过 scale 缩放）
    ctx.font = `${options.fontSize}px Arial`;
    ctx.textAlign = options.textAlign as CanvasTextAlign;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000';
    
    // 计算文本 x 坐标（根据对齐方式，使用原始尺寸）
    let x = 0;
    if (options.textAlign === 'center') {
      x = options.boxWidth / 2;
    } else if (options.textAlign === 'right') {
      x = options.boxWidth;
    } else {
      x = 0;
    }
    
    // 绘制文本（使用原始坐标，因为已经通过 scale 缩放）
    ctx.fillText(text, x, padding / options.scale / 2);
    
    return canvas;
  }
  
  // 合并条形码图片和文本 canvas
  private _mergeBarcodeAndText(
    barcodeImage: HTMLCanvasElement,
    textCanvas: HTMLCanvasElement,
    textPosition: string,
    scale: number,
    targetHeight?: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建 canvas 上下文');
    }
    
    // 计算合并后的尺寸（使用高分辨率）
    const barcodeWidth = barcodeImage.width;
    const barcodeHeight = barcodeImage.height;
    
    // 文本 canvas 的实际尺寸（已经是高分辨率）
    const textHeight = textCanvas.height;
    const textWidth = textCanvas.width;
    
    // 使用较大的宽度作为最终宽度（高分辨率）
    const finalWidth = Math.max(barcodeWidth, textWidth);
    
    // 计算目标高度（如果提供了 targetHeight）
    let finalHeight: number;
    let barcodeDrawHeight: number; // SVG 的实际绘制高度（可能被拉伸或裁剪）
    
    if (targetHeight !== undefined && targetHeight > 0) {
      // 根据传入的 height 和 scale 计算高分辨率目标高度
      const targetHeightScaled = targetHeight * scale;
      
      // 规则1: 如果文本高度大于目标高度，以文本高度为准（保证文本完整展示）
      if (textHeight > targetHeightScaled) {
        finalHeight = textHeight;
        // 如果文本在上方，条形码高度为0；如果文本在下方，条形码高度也为0（因为文本占满全部高度）
        barcodeDrawHeight = 0;
      } else {
        // 规则2: 如果 SVG + text 的高度小于目标高度，需要拉伸 SVG
        const availableHeightForBarcode = targetHeightScaled - textHeight;
        if (barcodeHeight + textHeight < targetHeightScaled) {
          finalHeight = targetHeightScaled;
          barcodeDrawHeight = availableHeightForBarcode; // 拉伸 SVG
        } else {
          // 规则3: 如果 SVG 高度大于可用高度，裁剪 SVG
          finalHeight = targetHeightScaled;
          barcodeDrawHeight = Math.min(barcodeHeight, availableHeightForBarcode); // 裁剪 SVG
        }
      }
    } else {
      // 如果没有提供目标高度，使用实际合并后的高度
      finalHeight = barcodeHeight + textHeight;
      barcodeDrawHeight = barcodeHeight;
    }
    
    // 设置 canvas 的实际尺寸（高分辨率）
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    
    // 设置 canvas 的显示尺寸（CSS 尺寸）
    canvas.style.width = `${finalWidth / scale}px`;
    canvas.style.height = `${finalHeight / scale}px`;
    
    // 设置背景色（如果需要）
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 根据 textPosition 决定文本位置
    const textX = (finalWidth - textWidth) / 2;
    const barcodeX = (finalWidth - barcodeWidth) / 2;
    
    if (textPosition === 'top') {
      // 文本在上方
      let currentY = 0;
      
      // 绘制文本（始终完整显示）
      ctx.drawImage(
        textCanvas,
        0,
        0,
        textWidth,
        textHeight,
        textX,
        currentY,
        textWidth,
        textHeight
      );
      currentY += textHeight;
      
      // 绘制条形码（可能被拉伸或裁剪）
      if (barcodeDrawHeight > 0 && currentY < finalHeight) {
        ctx.drawImage(
          barcodeImage,
          0,
          0,
          barcodeWidth,
          barcodeHeight,
          barcodeX,
          currentY,
          barcodeWidth,
          barcodeDrawHeight
        );
      }
    } else {
      // 文本在下方（默认）
      let currentY = 0;
      
      // 绘制条形码（可能被拉伸或裁剪）
      if (barcodeDrawHeight > 0) {
        ctx.drawImage(
          barcodeImage,
          0,
          0,
          barcodeWidth,
          barcodeHeight,
          barcodeX,
          currentY,
          barcodeWidth,
          barcodeDrawHeight
        );
        currentY += barcodeDrawHeight;
      }
      
      // 绘制文本（始终完整显示）
      ctx.drawImage(
        textCanvas,
        0,
        0,
        textWidth,
        textHeight,
        textX,
        currentY,
        textWidth,
        textHeight
      );
    }
    
    return canvas;
  }

  _defaultBarcodeOption() {
    return {
      value: '123456',
      format: CodeType.CODE128,
      textAlign: 'center',
      textPosition: 'bottom',
      fontSize: 12,
      background: '#fff',
      lineColor: '#000',
      displayValue: true,
      margin: 0,
      width: 1,
      height: 30,
      boxWidth: 60,
    };
  }

  // 更新条形码图片的辅助方法（带防抖）
  private _updateBarcodeImageDebounced: Map<fabric.Image, NodeJS.Timeout> = new Map();
  
  private async _updateBarcodeImage(imgEl: fabric.Image, immediate = false) {
    const extension = imgEl.get('extension');
    if (!extension) return;
    
    // 如果已经有待执行的更新，清除它
    const existingTimeout = this._updateBarcodeImageDebounced.get(imgEl);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    const updateFn = async () => {
      const target = imgEl;
      const options = {
        ...extension,
        boxWidth: target.width,
        height: target.height,
      };
      
      try {
        const url = await this._getBase64Str(options);
        imgEl.setSrc(url);
        imgEl.set('extension', options);
        this.canvas.renderAll();
      } catch (error) {
        console.error('更新条形码失败:', error);
      } finally {
        this._updateBarcodeImageDebounced.delete(imgEl);
      }
    };
    
    if (immediate) {
      await updateFn();
    } else {
      // 防抖：300ms 后执行
      const timeout = setTimeout(updateFn, 300);
      this._updateBarcodeImageDebounced.set(imgEl, timeout);
    }
  }

  async addBarcode() {
    const option = this._defaultBarcodeOption();
    const url = await this._getBase64Str(JSON.parse(JSON.stringify(option)));
    fabric.Image.fromURL(
      url,
      (imgEl) => {
        imgEl.set({
          extensionType: 'barcode',
          extension: option,
        });
        imgEl.scaleToWidth(option.boxWidth);
        
        // 监听对象修改事件（大小变化）- 立即更新
        imgEl.on('modified', async (event: any) => {
          const target = (event.target as fabric.Image) || imgEl;
          await this._updateBarcodeImage(target, true);
        });
        
        // 监听缩放事件（防抖更新）
        imgEl.on('scaling', () => {
          this._updateBarcodeImage(imgEl, false);
        });
        
        // 监听缩放结束事件（立即更新）
        imgEl.on('scaled', async () => {
          await this._updateBarcodeImage(imgEl, true);
        });
        
        // 监听 canvas zoom 变化（防抖更新）
        const zoomHandler = () => {
          this._updateBarcodeImage(imgEl, false);
        };
        this.canvas.on('mouse:wheel', zoomHandler);
        
        // 保存事件处理器，以便在销毁时移除
        (imgEl as any)._barcodeZoomHandler = zoomHandler;
        
        this.canvas.add(imgEl);
        this.canvas.setActiveObject(imgEl);
        this.editor.position('center');
        this.canvas.renderAll();
        this.editor.saveState();
      },
      { crossOrigin: 'anonymous' }
    );
  }

  async setBarcode(option: any) {
    try {
      const url = await this._getBase64Str(option);
      const activeObject = this.canvas.getActiveObjects()[0];
      fabric.Image.fromURL(
        url,
        (imgEl) => {
          imgEl.set({
            left: activeObject.left,
            top: activeObject.top,
            extensionType: 'barcode',
            extension: { ...option },
          });
          imgEl.scaleToWidth(activeObject.getScaledWidth());
          
          // 监听对象修改事件（大小变化）- 立即更新
          imgEl.on('modified', async (event: any) => {
            const target = (event.target as fabric.Image) || imgEl;
            await this._updateBarcodeImage(target, true);
          });
          
          // 监听缩放事件（防抖更新）
          imgEl.on('scaling', () => {
            this._updateBarcodeImage(imgEl, false);
          });
          
          // 监听缩放结束事件（立即更新）
          imgEl.on('scaled', async () => {
            await this._updateBarcodeImage(imgEl, true);
          });
          
          // 监听 canvas zoom 变化（防抖更新）
          const zoomHandler = () => {
            this._updateBarcodeImage(imgEl, false);
          };
          this.canvas.on('mouse:wheel', zoomHandler);
          
          // 保存事件处理器，以便在销毁时移除
          (imgEl as any)._barcodeZoomHandler = zoomHandler;
          
          this.editor.del();
          this.canvas.add(imgEl);
          this.canvas.setActiveObject(imgEl);
        },
        { crossOrigin: 'anonymous' }
      );
    } catch (error) {
      console.log(error);
    }
  }

  getBarcodeTypes() {
    return Object.values(CodeType);
  }

  destroy() {
    console.log('pluginDestroy');
  }
}

export default BarCodePlugin;
