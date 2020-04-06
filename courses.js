const fs = require("fs");
const path = require("path");

class Courses {
  constructor(page) {
    this.path = path.join(__dirname, "result");
    this.fileName = "courses.json";
    this.fileIsExist = fs.existsSync(this.path, this.fileName);
    this.page = page;
    this.data = [];
    this.createPath();
  }

  createPath() {
    fs.mkdirSync(this.path, { recursive: true });
  }

  readCoursesFile() {
    console.log(`Đọc file ${this.fileName}`);
    if (!this.fileIsExist) {
      const error = new Error("File không tồn tại");
      error.name = "ErrorReadFile";
      throw error;
    }

    let courses = fs.readFileSync(path.join(this.path, this.fileName));
    courses = JSON.parse(courses);
    console.log("Đọc file thành công");
    return courses;
  }

  writeCoursesFile() {
    console.log("Tiến hành ghi file");

    if (this.data.length == 0) {
      const error = new Error("Không có dữ liệu để ghi");
      error.name = "ErrorWriteFile";
      throw error;
    }

    fs.writeFile(
      path.join(this.path, this.fileName),
      JSON.stringify(this.data, null, 4),
      (err) => {
        if (err) {
          const error = new Error("Lỗi trong quá trình ghi file");
          error.name = "ErrorWriteFile";
          throw error;
        }
        console.log("Ghi file thành công");
      }
    );
  }

  dataCrawler() {
    return new Promise(async (resolve, reject) => {
      try {
        console.log("Tiến hành crawl data");
        const allCourses = await this.page.evaluate(() => {
          let courses = document.querySelectorAll(".enrolled-child-course");
          courses = [...courses];
          courses = courses.map((elem, index) => ({
            index,
            name: elem.querySelector(".course-listing-title").innerText,
            link: elem.querySelector("a").href,
          }));
          console.log("Crawl data thành công");

          return courses;
        });

        return resolve(allCourses);
      } catch (err) {
        const error = new Error(err);
        error.name = "UnHandle";
        return reject(error);
      }
    });
  }

  allCourses() {
    if (this.fileIsExist) {
      const data = this.readCoursesFile();
      this.data = data;
      return data;
    }
    return this.dataCrawler()
      .then((data) => {
        this.data = data;
        this.writeCoursesFile();
        return data;
      })
      .catch((err) => {
        console.log(err);
        return [];
      });
  }
}

module.exports = Courses;
