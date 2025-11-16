<!--
 * @Author: June
 * @Description: 全局长度单位切换（px / mm）
-->

<template>
  <div class="attr-item-box">
    <Divider plain orientation="left">
      <h4>长度单位</h4>
    </Divider>
    <Form :label-width="60" inline class="form-wrap">
      <FormItem label="单位">
        <Select v-model="unit" style="width: 140px" @on-change="onChangeUnit">
          <Option value="px">px（像素）</Option>
          <Option value="mm">mm（毫米）</Option>
        </Select>
      </FormItem>
    </Form>
  </div>
  </template>

<script setup name="UnitSwitch" lang="ts">
import useSelect from '@/hooks/select';

const { canvasEditor } = useSelect();

const unit = ref<'px' | 'mm'>('px');

onMounted(() => {
  unit.value = (canvasEditor.getUnit && canvasEditor.getUnit()) || 'px';
  canvasEditor.on && canvasEditor.on('unitChange', (u: 'px' | 'mm') => (unit.value = u));
});

const onChangeUnit = (value: 'px' | 'mm') => {
  canvasEditor.setUnit && canvasEditor.setUnit(value);
};
</script>

<style scoped lang="less">
.form-wrap {
  display: flex;
}
</style>


