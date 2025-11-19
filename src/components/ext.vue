<template>
  <div class="fix-button-box">
    <Button long @click="exportJSON">
      导出
    </Button>
    <Button long @click="importJSON">
      导入
    </Button>
    <Button long @click="downloadImage">
      下载图片
    </Button>
    <Button long @click="printPDF">
      打印
    </Button>
  </div>
</template>

<script setup name="Flip">
import useSelect from '@/hooks/select';

const { canvasEditor } = useSelect();

const exportJSON = () => {
  const json = canvasEditor.getJson();
  console.log('json', json)
  sessionStorage.setItem('drawJSON', JSON.stringify(json))
}

const importJSON = () => {
  const json = sessionStorage.getItem('drawJSON');
  canvasEditor.loadJSON(json);
}

const downloadImage = () => {
  canvasEditor.saveImg();
}

const printPDF = () => {
  canvasEditor.printPDF({
    width: 30,
    height: 40,
    base64: '123',
  })
}

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
