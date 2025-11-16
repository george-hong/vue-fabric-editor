<!--
 * @Author: 秦少卫
 * @Date: 2022-04-21 20:20:20
 * @LastEditors: 秦少卫
 * @LastEditTime: 2023-08-05 18:44:54
 * @Description: 缩放元素
-->
<template>
  <div class="box">
    <!-- <ButtonGroup> -->
    <Button @click="big">
      <bigIcon width="14" height="14"></bigIcon>
    </Button>
    <input
      class="zoom-input"
      v-model="zoomInput"
      @blur="onInputBlur"
      type="text"
      inputmode="numeric"
      aria-label="zoom percent"
    />
    <span class="zoom-suffix">%</span>
    <Button @click="small">
      <smallIcon width="14" height="14"></smallIcon>
    </Button>
    <Button @click="rSet" icon="ios-expand"></Button>
    <Button @click="setViewport" icon="md-contract"></Button>
    <!-- </ButtonGroup> -->
  </div>
</template>

<script setup name="Zoom">
import { fabric } from 'fabric';
import useSelect from '@/hooks/select';
import bigIcon from '@/assets/icon/zoom/big.svg';
import smallIcon from '@/assets/icon/zoom/small.svg';
import { ref, onMounted, onBeforeUnmount } from 'vue';

const { canvasEditor } = useSelect();

const zoomPercent = ref(0);
const zoomInput = ref('');
const refreshZoom = () => {
  const canvas = canvasEditor?.fabricCanvas;
  if (!canvas || !canvas.getZoom) return;
  const zoom = canvas.getZoom() || 1;
  zoomPercent.value = Math.round(zoom * 100);
  zoomInput.value = String(zoomPercent.value);
};

const rSet = () => {
  canvasEditor.one();
  requestAnimationFrame(refreshZoom);
};
const big = () => {
  canvasEditor.big();
  requestAnimationFrame(refreshZoom);
};
const small = () => {
  canvasEditor.small();
  requestAnimationFrame(refreshZoom);
};
const setViewport = () => {
  canvasEditor.auto();
  requestAnimationFrame(refreshZoom);
};

const onInputBlur = () => {
  const raw = (zoomInput.value || '').trim().replace('%', '');
  const num = Number(raw);
  if (!isFinite(num) || num <= 0) {
    // 恢复显示
    refreshZoom();
    return;
  }
  // clamp 到 1% - 2000%（对应 0.01 - 20 的 zoom）
  const clamped = Math.min(2000, Math.max(1, Math.round(num)));
  zoomInput.value = String(clamped);
  zoomPercent.value = clamped;
  const zoomScale = clamped / 100;
  const canvas = canvasEditor?.fabricCanvas;
  if (!canvas) return;
  const center = canvas.getCenter();
  canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoomScale);
};

let wheelHandler;
let afterRenderHandler;
let waitInitTimer;
onMounted(() => {
  const tryBind = () => {
    const canvas = canvasEditor?.fabricCanvas;
    if (!canvas) return false;
    refreshZoom();
    wheelHandler = () => requestAnimationFrame(refreshZoom);
    afterRenderHandler = () => refreshZoom();
    canvas.on('mouse:wheel', wheelHandler);
    canvas.on('after:render', afterRenderHandler);
    return true;
  };
  // 立即尝试一次
  if (!tryBind()) {
    // 等待 fabricCanvas 就绪
    waitInitTimer = setInterval(() => {
      if (tryBind()) {
        clearInterval(waitInitTimer);
        waitInitTimer = null;
      }
    }, 50);
  }
});
onBeforeUnmount(() => {
  const canvas = canvasEditor?.fabricCanvas;
  if (!canvas) return;
  if (wheelHandler) canvas.off('mouse:wheel', wheelHandler);
  if (afterRenderHandler) canvas.off('after:render', afterRenderHandler);
  if (waitInitTimer) {
    clearInterval(waitInitTimer);
    waitInitTimer = null;
  }
});
</script>
<style scoped lang="less">
.box {
  position: absolute;
  right: 10px;
  bottom: 10px;

  :deep(.ivu-btn:hover) {
    svg {
      fill: #57a3f3;
    }
  }

  .zoom-input {
    width: 48px;
    height: 28px;
    line-height: 28px;
    border: 1px solid #e8eaec;
    border-radius: 4px;
    margin: 0 6px 0 6px;
    padding: 0 6px;
    font-size: 12px;
    color: #333;
    outline: none;
  }
  .zoom-input:focus {
    border-color: #57a3f3;
    box-shadow: 0 0 0 2px rgba(87, 163, 243, 0.2);
  }
  .zoom-suffix {
    margin-right: 6px;
    font-size: 12px;
    color: #666;
    user-select: none;
  }
}
</style>
