const fs = require("fs");
const path = require("path");

const SAVE_PATH = process.env.SAVE_PATH;

class Courses {
  constructor(page) {
    this.path = path.join(SAVE_PATH, "result");
    this.fileName = "courses.json";
    this.fileIsExist = fs.existsSync(this.path, this.fileName);
    this.page = page;
    this.data = [];
    this.createPath();
  }

  createPath() {
    fs.mkdirSync(path.join(this.path, "result"), { recursive: true });
  }

  readCoursesFile() {
    if (!this.fileIsExist) {
      const error = new Error(`[${this.fileName}]: Không tồn tại`);
      error.name = "ErrorReadFile";
      throw error;
    }

    let courses = fs.readFileSync(path.join(this.path, this.fileName), "utf-8");
    courses = JSON.parse(courses);
    console.log(`[${this.fileName}]: Đọc thành công`);
    return courses;
  }

  writeCoursesFile() {
    console.log("Tiến hành ghi file");

    if (this.data.length == 0) {
      const error = new Error("Không có dữ liệu để ghi");
      error.name = "ErrorWriteFile";
      throw error;
    }

    try {
      fs.writeFile(
        path.join(this.path, this.fileName),
        JSON.stringify(this.data, null, 4),
        "utf-8",
        (err) => {
          if (err) {
            const error = new Error("Lỗi trong quá trình ghi file");
            error.name = "ErrorWriteFile";
            throw error;
          }
          console.log("Ghi file thành công");
        }
      );
    } catch (err) {
      console.log(err);
    }
  }

  dataCrawler() {
    return new Promise(async (resolve, reject) => {
      try {
        const allCourses = await this.page.evaluate(() => {
          let courses = document.querySelectorAll(".enrolled-child-course");
          courses = [...courses];
          courses = courses.map((elem, index) => ({
            index,
            name: elem.querySelector(".course-listing-title").innerText,
            link: elem.querySelector("a").href,
          }));
          console.log("Lấy dữ liệu website thành công");

          return courses;
        });

        return resolve(allCourses);
      } catch (err) {
        console.log("Lấy dữ liệu website thất bại");
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
