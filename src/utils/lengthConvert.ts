export default class LengthConvert {
  static devicePixelRatio = window.devicePixelRatio
  static _deviceDPI;
  static CONSTANTS = {
    INCH_TO_MM: 25.4,
    DEFAULT_DPI: 96,
    STANDARD_DPI: {
      SCREEN: 96,
      PRINT: 300,
      HIGH_RES: 600,
    },
  };

  /**
   * 获取设备DPI（缓存结果避免重复计算）
   */
  static getDeviceDPI() {
    if (!this._deviceDPI) {
      try {
        const element = document.createElement("div");
        element.style.width = "1in";
        element.style.height = "0";
        element.style.position = "absolute";
        element.style.visibility = "hidden";

        document.body.appendChild(element);
        const cssPixels = element.offsetWidth;
        document.body.removeChild(element);

        this._deviceDPI =
          cssPixels * window.devicePixelRatio || this.CONSTANTS.DEFAULT_DPI;
      } catch (error) {
        console.warn(
          "无法获取设备DPI，使用默认值:",
          this.CONSTANTS.DEFAULT_DPI
        );
        this._deviceDPI = this.CONSTANTS.DEFAULT_DPI;
      }
    }
    return this._deviceDPI;
  }

  /**
   * 毫米转像素
   */
  static mmToPx(mm, dpi, options) {
    this.validateNumber(mm, "毫米值");
    const currentDpi = this.getValidDpi(dpi);
    const directValue = (mm * currentDpi) / this.CONSTANTS.INCH_TO_MM;
    return options?.direct ? directValue : Math.ceil(directValue);
  }

  /**
   * 像素转毫米
   */
  static pxToMm(px, dpi, options) {
    this.validateNumber(px, "像素值");
    const currentDpi = this.getValidDpi(dpi);
    return (px * this.CONSTANTS.INCH_TO_MM) / currentDpi;
  }

  /**
   * 批量转换毫米到像素
   */
  static mmToPxBatch(mmArray, dpi) {
    return mmArray.map((mm) => this.mmToPx(mm, dpi));
  }

  /**
   * 批量转换像素到毫米
   */
  static pxToMmBatch(pxArray, dpi) {
    return pxArray.map((px) => this.pxToMm(px, dpi));
  }

  // 私有方法
  static getValidDpi(dpi) {
    const validDpi = dpi || this.getDeviceDPI();
    if (validDpi <= 0) {
      throw new Error("DPI值必须大于0");
    }
    return validDpi;
  }

  static validateNumber(value, name) {
    if (typeof value !== "number" || isNaN(value)) {
      throw new Error(`${name}必须是有效数字`);
    }
  }

  // 重置设备DPI缓存（用于响应设备变化）
  static resetCache() {
    this._deviceDPI = null;
  }

  /**
   * pt（磅）转 px（像素）
   * @param {number} pt - 磅值
   * @param {object} [options] - 可选参数 { direct: true } 是否允许非整数
   * @returns {number} 像素值
   */
  static ptToPx(pt, options) {
    this.validateNumber(pt, "磅值");
    const currentDpi = this.getValidDpi();
    // 1英寸 = 72pt，所以 px = pt * dpi / 72
    const directValue = (pt * currentDpi) / 72;
    return options?.direct ? directValue : Math.ceil(directValue);
  }

  /**
   * px（像素）转 pt（磅）
   * @param {number} px - 像素值
   * @returns {number} 磅值
   */
  static pxToPt(px) {
    this.validateNumber(px, "像素值");
    const currentDpi = this.getValidDpi();
    // 1英寸 = 72pt，所以 pt = px * 72 / dpi
    return (px * 72) / currentDpi;
  }

  /**
   * 批量pt转px
   * @param {number[]} ptArray
   * @param {object} [options]
   * @returns {number[]}
   */
  static ptToPxBatch(ptArray, options) {
    return ptArray.map((pt) => this.ptToPx(pt, options));
  }

  /**
   * 批量px转pt
   * @param {number[]} pxArray
   * @returns {number[]}
   */
  static pxToPtBatch(pxArray) {
    return pxArray.map((px) => this.pxToPt(px));
  }


  static mmToPt(mm) {
    // 毫米转磅（pt）
    // 1英寸 = 25.4毫米，1英寸 = 72pt，所以 1毫米 = 72/25.4 pt
    this.validateNumber(mm, "毫米值");
    return (mm * 72) / 25.4;
  }
}
