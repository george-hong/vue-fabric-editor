<template>
  <div class="fix-button-box">
    <Button long @click="exportJSON">导出</Button>
    <Button long @click="importJSON">导入</Button>
    <Button long @click="downloadImage">下载图片</Button>
    <Select v-model="selectedPrinter" filterable>
      <Option v-for="option in printList" :key="option.name" :value="option.name">
        {{ option.displayName }}
      </Option>
    </Select>
    <Button long @click="printPDF">打印</Button>
  </div>
</template>

<script setup name="Flip">
import useSelect from '@/hooks/select';

const { canvasEditor } = useSelect();
const printList = ref([]);
const selectedPrinter = ref('');

const exportJSON = () => {
  const json = canvasEditor.getJson();
  console.log('json', json);
  localStorage.setItem('drawJSON', JSON.stringify(json));
};

const importJSON = () => {
  const json = localStorage.getItem('drawJSON');
  canvasEditor.loadJSON(json);
};

const downloadImage = () => {
  canvasEditor.saveImg();
};

const printPDF = async () => {
  const base64 = await canvasEditor.getBase64();
  canvasEditor.printPDF({
    width: 40,
    height: 30,
    base64,
    printer: selectedPrinter.value,
  });
};

setTimeout(() => {
  printList.value = canvasEditor.getPrinterList();
}, 3000);
</script>

<style scoped lang="less">
.fix-button-box {
  position: absolute;
  bottom: 60px;
  right: 10px;
  display: flex;
  justify-content: center;
}
</style>
