module.exports = async (email, password, urlSignin, page) => {
  console.log("Đang đăng nhập");
  try {
    await page.goto(urlSignin);

    await page.waitFor("#user_email");
    await page.type("#user_email", email);

    await page.waitFor("#user_password");
    await page.type("#user_password", password);

    await Promise.all([page.click(".login-button"), page.waitForNavigation()]);

    const alerts = await page.$$eval(".alert-danger", (alerts) =>
      alerts.map((alert) => alert.innerText)
    );
    if (alerts.length != 0) {
      throw new Error(alerts);
    }

    console.log("Đăng nhập thành công");
    return true;
  } catch (err) {
    console.log("Đăng nhập thất bại");
    console.log("Error:", err);
    return false;
  }
};
