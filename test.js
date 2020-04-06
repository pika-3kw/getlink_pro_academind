const fetch = require("node-fetch");

fetch("https://www.filepicker.io/api/file/xKJZEmMQT2y0PVqZnTRC")
  .then((res) => res.text())
  .then((body) => console.log(body));
