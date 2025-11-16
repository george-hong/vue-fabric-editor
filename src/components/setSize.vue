<!--
 * @Author: 秦少卫
 * @Date: 2022-09-03 19:16:55
 * @LastEditors: June
 * @LastEditTime: 2024-11-22 15:28:43
 * @Description: 尺寸设置
-->

<template>
  <div v-if="!isSelect" class="attr-item-box">
    <!-- <h3>{{ $t('bgSeting.size') }}</h3> -->
    <Divider plain orientation="left">
      <h4>{{ $t('bgSeting.size') }}</h4>
    </Divider>
    <Form :label-width="40" inline class="form-wrap">
      <FormItem :label="$t('bgSeting.width')" prop="name">
        <InputNumber disabled v-model="width" readonly @on-change="setSize"></InputNumber>
        <span style="margin-left: 8px">{{ unit }}</span>
      </FormItem>
      <FormItem :label="$t('bgSeting.height')" prop="name">
        <InputNumber disabled v-model="height" readonly @on-change="setSize"></InputNumber>
        <span style="margin-left: 8px">{{ unit }}</span>
      </FormItem>
      <FormItem :label-width="0">
        <Button type="text" @click="showSetSize">
          <Icon type="md-create" />
        </Button>
      </FormItem>
    </Form>

    <!-- <Divider plain></Divider> -->
    <!-- 修改尺寸 -->
    <modalSzie :title="$t('setSizeTip')" ref="modalSizeRef" @set="handleConfirm"></modalSzie>
  </div>
</template>

<script setup name="CanvasSize" lang="ts">
import useSelect from '@/hooks/select';
// @ts-ignore
import modalSzie from '@/components/common/modalSzie';

const { isSelect, canvasEditor } = useSelect();

const modalSizeRef = ref<any>(null);

const width = ref(0);
const height = ref(0);
const unit = ref<'px' | 'mm'>('px');

const toDisplay = (px: number) => {
  if (unit.value === 'px') return Math.round(px);
  return Math.round((canvasEditor.pxToMm ? canvasEditor.pxToMm(px) : (px * 25.4) / 96) * 10) / 10;
};
const toPx = (val: number) => {
  if (unit.value === 'px') return val;
  return canvasEditor.mmToPx ? canvasEditor.mmToPx(val) : (val * 96) / 25.4;
};

onMounted(() => {
  unit.value = (canvasEditor.getUnit && canvasEditor.getUnit()) || 'px';
  canvasEditor.on && canvasEditor.on('unitChange', (u: 'px' | 'mm') => {
    unit.value = u;
    // 重新按新单位展示
    const size = canvasEditor.getWorkspase();
    const { width: w, height: h } = size || {};
    width.value = toDisplay(w || 0);
    height.value = toDisplay(h || 0);
  });
  const size = canvasEditor.getWorkspase();
  const { width: w, height: h } = size || {};
  width.value = toDisplay(w);
  height.value = toDisplay(h);
  canvasEditor.on('sizeChange', (w, h) => {
    width.value = toDisplay(w);
    height.value = toDisplay(h);
  });
});

const setSize = () => {
  // 本组件中 InputNumber 为展示禁用，不直接触发
  const pxW = toPx(width.value);
  const pxH = toPx(height.value);
  canvasEditor.setSize(pxW, pxH);
};

const showSetSize = () => {
  // 将当前展示单位的值传递到弹窗
  modalSizeRef.value!.showSetSize(width.value, height.value);
};
const handleConfirm = (w: number, h: number) => {
  // 弹窗回传为当前展示单位的值，此处需转换为 px 再设置
  const pxW = toPx(w);
  const pxH = toPx(h);
  width.value = toDisplay(pxW);
  height.value = toDisplay(pxH);
  canvasEditor.setSize(pxW, pxH);
};
</script>

<style scoped lang="less">
:deep(.ivu-form-item) {
  margin-bottom: 0;
}

:deep(.ivu-input-number) {
  width: 70px;
}
.form-wrap {
  display: flex;
}
</style>
