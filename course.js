const path = require("path");
const fs = require("fs");

const SAVE_PATH = process.env.SAVE_PATH;

class Course {
  constructor(id) {
    this.id = id;
    this.data = [];
    this.refLinks = [];
    this.downloadLinks = [];
    this.path = "";
    this.url = "";
    this.name = "";
    this.lastLectureLink = "";
    this.linkLectures = [];
    this.startIndex = 0;
    this.status = "Not Download";
    this.sections = {};
    this.readInfo();
    this.createPath();
    this.readData();
  }

  readInfo() {
    try {
      let dataCourses = fs.readFileSync(
        path.join(SAVE_PATH, "result", "courses.json"),
        "utf-8"
      );

      dataCourses = JSON.parse(dataCourses);
      const courseInfo = dataCourses.find((course) => course.index === this.id);

      this.name = courseInfo.name;
      this.url = courseInfo.link;

      const folderName =
        this.id.toString().padStart(2, "0") +
        "-" +
        courseInfo.name.replace(
          / |\-|\+|\,|\"|\'|\?|\:|\!|\@|\#|\$|\\|\*|\//g,
          ""
        );
      this.path = path.join(SAVE_PATH, folderName);

      return dataCourses;
    } catch (err) {
      console.log(err);
    }
  }

  findSectionName(link) {
    let sectionName;
    for (let section of this.data) {
      sectionName = section.name;
      const lectures = section.lectures;

      for (let lecture of lectures) {
        const re = lecture.link.includes(link);
        if (re) {
          return sectionName;
        }
      }
    }
  }

  readData() {
    try {
      if (!fs.existsSync(path.join(this.path, "data.json"))) {
        console.log("Không có dữ liệu cũ");
        return;
      }

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
      await page.goto(this.url);

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

      this.writeJsonData(this.data, "data.json");
      this.writeJsonData(this.linkLectures, "link-lectures.json");
    } catch (err) {
      console.log(err);
    }
  }

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

        let lectureTextContent = await page.$(".lecture-text-container");

        if (lectureTextContent) {
          lectureTextContent = await page.$eval(
            ".lecture-text-container",
            (elem) => elem.innerText
          );

          const lectureName = await page.$eval(
            "#lecture_heading",
            (elem) => elem.innerText
          );

          const sectionName = this.findSectionName(this.lastLectureLink);

          const sectionDir = this.sections[sectionName].sectionDir;

          this.writeTextData(
            lectureTextContent,
            sectionDir,
            lectureName
              .replace(/ |\-|\+|\,|\"|\'|\?|\:|\!|\@|\#|\$|\\|\*|\//g, "")
              .trim()
          );
        }

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

    this.writeJsonData(dataProcess, FILE_NAME);
  }

  saveDownloadLinks() {
    const FILE_NAME = "download-links";

    console.log(`Tiến hành ghi file: ${FILE_NAME}`);

    let downloadLinks = this.downloadLinks.join("\n");

    this.writeTextData(downloadLinks, "", FILE_NAME);
  }

  createPath() {
    fs.mkdirSync(this.path, { recursive: true });
  }

  createSectionFolder() {
    this.sections = {};

    this.data.forEach((section, i) => {
      const sectionDir =
        i.toString().padStart(2, "0") +
        "-" +
        section.name.replace(
          / |\-|\+|\,|\"|\'|\?|\:|\!|\@|\#|\$|\\|\*|\//g,
          ""
        );

      this.sections[section.name] = {
        id: i,
        sectionDir,
      };

      try {
        fs.mkdirSync(path.join(this.path, sectionDir), { recursive: true });
      } catch (err) {
        console.log(err);
      }
    });
  }

  writeJsonData(data, fileName) {
    try {
      fs.writeFile(
        path.join(this.path, fileName),
        JSON.stringify(data, null, 4),
        "utf-8",
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
    } catch (err) {
      console.log(err);
    }
  }

  writeTextData(data, folderName, fileName) {
    fileName = fileName + ".txt";

    try {
      fs.writeFile(
        path.join(this.path, folderName, fileName),
        data,
        "utf-8",
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
    } catch (err) {
      console.log(err);
    }
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
          linkDownload: [],
        };
      });

      mergedData.push({ name: section.name, lectures: merged });
    }

    let dataLinks = mergedData.map((section) => {
      return {
        name: section.name,
        linksDownload: section.lectures
          .filter((lecture) => lecture.linkDownload.length !== 0)
          .map((lecture) => lecture.linkDownload),
      };
    });

    for (let section of dataLinks) {
      const fileName = this.sections[section.name].sectionDir;

      console.log(path.join(this.path, fileName, "links.txt"));

      let data = [];
      try {
        data = fs
          .readFileSync(path.join(this.path, fileName, "links.txt"))
          .toString()
          .split("\n");
      } catch (error) {}

      let newData = section.linksDownload.flat();

      data.push(...newData);

      data = data.filter((elem, i) => i === data.indexOf(elem));

      this.writeTextData(data.join("\n"), fileName, "links");
    }

    this.writeJsonData(mergedData, FILE_NAME);
  }
}

module.exports = Course;
