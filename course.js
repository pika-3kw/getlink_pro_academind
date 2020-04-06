const path = require("path");
const fs = require("fs");

class Course {
  constructor(id) {
    this.id = id;
    this.data = [];
    this.refLinks = [];
    this.downloadLinks = [];
    this.path = "";
    this.link = "";
    this.name = "";
    this.lastLectureLink = "";
    this.linkLectures = [];
    this.startIndex = 0;
    this.status = "Not Download";
    this.readInfo();
    this.createPath();
    this.readData();
  }

  readInfo() {
    try {
      let dataCourses = fs.readFileSync(
        path.join(__dirname, "result", "courses.json"),
        "utf-8"
      );

      dataCourses = JSON.parse(dataCourses);
      const courseInfo = dataCourses.find((course) => course.index === this.id);

      this.name = courseInfo.name;
      this.link = courseInfo.link;

      const folderName =
        this.id.toString().padStart(2, "0") +
        "-" +
        courseInfo.name.replace(/ |\-|\+|\,/g, "");
      this.path = path.join(__dirname, "Courses", folderName);

      return dataCourses;
    } catch (err) {
      console.log(err);
    }
  }

  readData() {
    try {
      if (!fs.existsSync(path.join(this.path, "data.json"))) {
        console.log("Không có dữ liệu cũ");
        return;
      }
      console.log("Bắt đầu lấy dữ liệu cũ");

      let data = fs.readFileSync(path.join(this.path, "data.json"), "utf-8");
      this.data = JSON.parse(data);

      let downloadLinks = fs.readFileSync(
        path.join(this.path, "download-links.txt"),
        "utf-8"
      );
      this.downloadLinks = downloadLinks.split("\n");

      let processData = fs.readFileSync(
        path.join(this.path, "process.json"),
        "utf-8"
      );
      processData = JSON.parse(processData);
      this.status = processData.status;
      this.startIndex = processData.startIndex;

      let linkLectures = fs.readFileSync(
        path.join(this.path, "link-lectures.json"),
        "utf-8"
      );
      this.linkLectures = JSON.parse(linkLectures);

      console.log("Lấy dữ liệu cũ thành công.");
    } catch (err) {
      console.log("Có lỗi khi lấy dữ liệu cũ");
      console.log(err);
    }
  }

  /**
   *
   * @param {*} page : puppeteer browser page
   * crawle course nam and all lectures( title and link) of course
   */

  async crawlAndWriteCourseData(page) {
    try {
      await page.goto(this.link);

      [this.data, this.linkLectures] = await page.evaluate(() => {
        let courseData = [];
        let linkLectures = [];

        let listSectionDiv = document.querySelectorAll(".course-section");
        listSectionDiv = [...listSectionDiv];

        listSectionDiv.forEach((sectionDiv) => {
          const sectionName = sectionDiv.querySelector(".section-title")
            .innerText;
          let allLecture = sectionDiv.querySelectorAll("li");
          allLecture = [...allLecture];

          allLecture = allLecture.map((elem) => ({
            title: elem.querySelector(".lecture-name").innerText,
            link: elem.querySelector("a").href,
          }));

          const section = {
            name: sectionName,
            lectures: allLecture,
          };

          courseData.push(section);
          linkLectures.push([...allLecture.map((lecture) => lecture.link)]);
        });

        return [courseData, linkLectures.flat()];
      });

      await this.writeData(this.data, "data-temp.json");
      await this.writeData(this.linkLectures, "link-lectures.json");
    } catch (err) {
      console.log(err);
    }
  }

  // writeText(content, ,fileName){

  // }

  async startGetLink(page, processBar) {
    try {
      processBar.start(this.linkLectures.length, this.startIndex);
      for (
        this.startIndex;
        this.startIndex < this.linkLectures.length;
        this.startIndex++
      ) {
        this.lastLectureLink = this.linkLectures[this.startIndex];
        await page.goto(this.lastLectureLink);
        const linkDownload = await page.$$eval(".download", (links) =>
          links.map((a) => a.href)
        );

        this.refLinks.push({
          link: this.lastLectureLink,
          linkDownload,
        });
        this.downloadLinks.push(...linkDownload);
        processBar.update(this.startIndex + 1);
      }

      processBar.stop();
    } catch (err) {
      console.log(err);
    }
  }

  async saveProcessData() {
    const FILE_NAME = "process.json";

    // let startLink = this.lastLectureLink || this.linkLectures[0];
    // let startIndex = this.linkLectures.findIndex((elem) => elem === startLink);

    const startIndex = this.startIndex;

    let status = "Downloading";

    if (startIndex === this.linkLectures.length) {
      status = "Downloaded";
    }

    if (startIndex <= 0) {
      status = "Not Download";
    }

    const dataProcess = {
      status,
      lastLectureLink: this.lastLectureLink,
      startIndex,
    };

    await fs.writeFile(
      path.join(this.path, FILE_NAME),
      JSON.stringify(dataProcess, null, 4),
      (err) => {
        if (err) {
          console.log(`Lưu file ${FILE_NAME} thất bại`);
          const error = new Error(`Lưu file ${FILE_NAME} thất bại`);
          error.name = "ErrorWriteFile";
          throw error;
        }
        console.log(`Lưu file ${FILE_NAME} thành công`);
      }
    );
  }

  createPath() {
    fs.mkdirSync(this.path, { recursive: true });
  }

  saveDownloadLinks() {
    const FILE_NAME = "download-links.txt";

    console.log(`Tiến hành ghi file: ${FILE_NAME}`);

    let downloadLinks = this.downloadLinks.join("\n");

    fs.writeFile(path.join(this.path, FILE_NAME), downloadLinks, (err) => {
      if (err) {
        console.log(`Lưu file ${FILE_NAME} thất bại`);
        const error = new Error(`Lưu file ${FILE_NAME} thất bại`);
        error.name = "ErrorWriteFile";
        throw error;
      }
      console.log(`Lưu file ${FILE_NAME} thành công`);
    });
  }

  writeData(data, fileName) {
    console.log(`Tiến hành ghi file: ${fileName}`);

    fs.writeFile(
      path.join(this.path, fileName),
      JSON.stringify(data, null, 4),
      (err) => {
        if (err) {
          console.log(`Lưu file ${fileName} thất bại`);
          const error = new Error(`Lưu file ${fileName} thất bại`);
          error.name = "ErrorWriteFile";
          throw error;
        }
        console.log(`Lưu file ${fileName} thành công`);
      }
    );
  }

  saveData() {
    const FILE_NAME = "data.json";
    console.log(`Tiến hành ghi file: ${FILE_NAME}`);

    // Merge data
    let mergedData = [];

    for (let section of this.data) {
      const merged = section.lectures.map((lecture) => {
        const result = this.refLinks.find((elem) => elem.link == lecture.link);

        if (result) {
          return {
            ...lecture,
            linkDownload: result.linkDownload,
          };
        }

        return {
          ...lecture,
        };
      });

      mergedData.push({ name: section.name, lectures: merged });
    }

    fs.writeFile(
      path.join(this.path, FILE_NAME),
      JSON.stringify(mergedData, null, 4),
      (err) => {
        if (err) {
          console.log(`Lưu file ${FILE_NAME} thất bại`);
          const error = new Error(`Lưu file ${FILE_NAME} thất bại`);
          error.name = "ErrorWriteFile";
          throw error;
        }
        console.log(`Lưu file ${FILE_NAME} thành công`);
      }
    );
  }
}

// const test = new Course(12);

// console.log(test.path);

module.exports = Course;
