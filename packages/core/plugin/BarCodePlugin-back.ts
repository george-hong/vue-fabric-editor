/*
 * @Author: 秦少卫
 * @Date: 2024-06-06 14:12:24
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-06-07 21:24:56
 * @Description: 条形码生成工具
 */

import { fabric } from 'fabric';
// @ts-ignore - bwip-js 可能没有类型定义
import * as bwipjs from 'bwip-js';
import type { IEditor, IPluginTempl } from '@kuaitu/core';
import LengthConvert from '@/utils/lengthConvert';

type IPlugin = Pick<BarCodePlugin, 'addBarcode' | 'setBarcode' | 'getBarcodeTypes'>;

declare module '@kuaitu/core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface IEditor extends IPlugin {}
}

// 条形码生成参数
// https://github.com/metafloor/bwip-js/wiki

enum CodeType {
  CODE128 = 'code128',
  EAN8 = 'ean8',
  EAN13 = 'ean13',
  ITF14 = 'itf14',
  codabar = 'codabar',
  pharmacode = 'pharmacode',
}

class BarCodePlugin implements IPluginTempl {
  static pluginName = 'BarCodePlugin';
  static apis = ['addBarcode', 'setBarcode', 'getBarcodeTypes'];
  constructor(public canvas: fabric.Canvas, public editor: IEditor) {}

  async hookTransform(object: any) {
    if (object.extensionType === 'barcode') {
      console.log('in trans ---------------------------------------');
      const url = await this._getBase64Str(object.extension);
      object.src = url;
    }
  }
  /**
   * 生成条码图片的 Base64 字符串
   * @param option 条码选项
   * @returns Promise<string> Base64 图片字符串
   */
  _getBase64Str(option: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const offscreenCanvas = document.createElement('canvas');

      // 将像素单位转换为毫米（1mm ≈ 3.7795275591px，但这里我们直接使用像素值作为毫米值，因为 bwip-js 会根据内容自动调整）
      // 或者我们可以使用 scaleX/scaleY 来控制大小
      const width = LengthConvert.pxToMm(option.width || 40); // 默认宽度（毫米）
      const height = LengthConvert.pxToMm(option.height || 15); // 默认高度（毫米）

      // 构建 bwip-js 选项
      const bwipOptions: any = {
        bcid: option.format || CodeType.CODE128, // 条码类型
        text: option.value || '123456', // 条码内容
        width, // 宽度（毫米）
        height, // 高度（毫米）
        includetext: option.displayValue !== false, // 是否显示文本
        textxalign: option.textAlign || 'center', // 文本水平对齐
        textyalign: option.textPosition === 'top' ? 'top' : 'bottom', // 文本垂直对齐
      };

      // 如果指定了背景色和线条颜色
      if (option.background) {
        bwipOptions.backgroundcolor = option.background;
      }
      if (option.lineColor) {
        bwipOptions.barcolor = option.lineColor;
      }

      // 使用 bwip-js 生成条码
      (bwipjs as any).toCanvas(offscreenCanvas, bwipOptions);

      const dataUrl = offscreenCanvas.toDataURL('image/png');

      resolve(dataUrl);
    });
  }

  /**
   * 处理条码大小变化，重新绘制条码图片
   * @param imgEl 条码图片对象
   */
  async _handleBarcodeSizeChange(imgEl: fabric.Image) {
    const extension = imgEl.get('extension');
    if (!extension) return;

    console.log('change ---- url');

    // 获取当前对象的实际尺寸（考虑缩放）
    const scaledWidth = imgEl.getScaledWidth();
    const scaledHeight = imgEl.getScaledHeight();

    // 计算原始尺寸（去除缩放影响）
    const scaleX = imgEl.scaleX || 1;
    const scaleY = imgEl.scaleY || 1;
    const originalWidth = scaledWidth / scaleX;
    const originalHeight = scaledHeight / scaleY;

    // 将像素转换为毫米（1mm ≈ 3.7795275591px，这里简化处理）
    // 或者直接使用像素值，bwip-js 会根据内容自动调整
    const widthInMm = originalWidth / 3.7795275591;
    const heightInMm = originalHeight / 3.7795275591;

    // 更新条码选项中的尺寸
    const options = {
      ...extension,
      width: widthInMm > 0 ? widthInMm : extension.width || 50, // 宽度（毫米）
      height: heightInMm > 0 ? heightInMm : extension.height || 10, // 高度（毫米）
    };

    try {
      // 重新生成条码图片
      const url = await this._getBase64Str(options);

      // 保存当前的位置和变换状态
      const currentLeft = imgEl.left;
      const currentTop = imgEl.top;
      const currentScaleX = imgEl.scaleX;
      const currentScaleY = imgEl.scaleY;
      const currentAngle = imgEl.angle;

      // 更新图片源
      imgEl.setSrc(url, () => {
        // 恢复位置和变换状态
        imgEl.set({
          left: currentLeft,
          top: currentTop,
          scaleX: currentScaleX,
          scaleY: currentScaleY,
          angle: currentAngle,
          extension: options,
        });
        this.canvas.renderAll();
      });
    } catch (error) {
      console.error('条码重新生成失败:', error);
    }
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
      margin: 0,
      displayValue: true, // bwip-js 默认显示文本
      width: 50, // 宽度（毫米）
      height: 10, // 高度（毫米）
    };
  }

  async addBarcode() {
    const option = this._defaultBarcodeOption();
    try {
      const url = await this._getBase64Str(JSON.parse(JSON.stringify(option)));
      console.log('url------', url);
      fabric.Image.fromURL(
        url,
        (imgEl) => {
          imgEl.set({
            extensionType: 'barcode',
            extension: option,
          });
          // imgEl.scaleToWidth(this.editor.getWorkspase().getScaledWidth() / 2);

          // 监听对象修改事件，处理大小变化
          imgEl.on('modified', () => {
            this._handleBarcodeSizeChange(imgEl);
          });

          this.canvas.add(imgEl);
          this.canvas.setActiveObject(imgEl);
          this.editor.position('center');
          this.canvas.renderAll();
          this.editor.saveState();
        },
        { crossOrigin: 'anonymous' }
      );
    } catch (error) {
      console.error('添加条码失败:', error);
    }
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

          // 监听对象修改事件，处理大小变化
          imgEl.on('modified', () => {
            this._handleBarcodeSizeChange(imgEl);
          });

          this.editor.del();
          this.canvas.add(imgEl);
          this.canvas.setActiveObject(imgEl);
        },
        { crossOrigin: 'anonymous' }
      );
    } catch (error) {
      console.error('设置条码失败:', error);
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
