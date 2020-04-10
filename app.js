const puppeteer = require("puppeteer");
const cliProgress = require("cli-progress");

const signIn = require("./signIn");
const Courses = require("./courses.js");
const Course = require("./course.js");

const URL_SIGNIN = "https://pro.academind.com/sign_in";
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

let courseId = 19;
let sign_in = false;

const bar1 = new cliProgress.SingleBar(cliProgress.Presets.shades_classic);

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  let page1 = await browser.newPage();
  await page1.setDefaultNavigationTimeout(0);

  sign_in = await signIn(EMAIL, PASSWORD, URL_SIGNIN, page1);

  if (!sign_in) return browser.close();

  const GetCourses = new Courses(page1);

  const allCourses = await GetCourses.allCourses();

  if (allCourses.length === 0) {
    console.log("Không có dữ liệu");
    return browser.close();
  }

  const courseTarget = new Course(courseId);

  let courstStatus = courseTarget.status;
  let courseName = courseTarget.name;
  let linkLectures = courseTarget.linkLectures;

  if (courstStatus === "Downloaded") {
    console.log("Khoá học đã được download");
    return browser.close();
  }

  console.log(`Khoá học: ${courseName}`);

  if (linkLectures.length === 0) {
    await courseTarget.crawlAndWriteCourseData(page1);
  }

  courseTarget.createSectionFolder();

  const page2 = await browser.newPage();
  await page2.setDefaultNavigationTimeout(0);

  await courseTarget.startGetLink(page2, bar1);

  // console.log(JSON.stringify(courseTarget.refLinks, null, 2));

  await courseTarget.saveDownloadLinks();

  await courseTarget.saveData();

  await courseTarget.saveProcessData();

  console.log("Close browser");

  browser.close();
  return;

  //
})();
