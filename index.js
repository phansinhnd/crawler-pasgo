const puppeteer = require('puppeteer');
const download = require('image-downloader');
// const unorm = require('unorm');

// function removeVietnameseAccents(str) {
//     // Sử dụng unorm để loại bỏ dấu
//     return unorm.nfd(str).replace(/[\u0300-\u036f]/g, "");
// }

const fs = require('fs');
let urlsToCrawl = [
    'https://pasgo.vn/ha-noi/nha-hang/',
    'https://pasgo.vn/ho-chi-minh/nha-hang/',
    'https://pasgo.vn/da-nang/nha-hang/',
    'https://pasgo.vn/khanh-hoa/nha-hang/'
];
const filePath = "restaurants.json";

// Sử dụng fs.writeFileSync trực tiếp
fs.writeFileSync(filePath, '', 'utf-8');
console.log(`Dữ liệu trong file ${filePath} đã bị xóa hoặc file đã được tạo mới.`);

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    let allElectronicData = [];
    // let electronicData;
    let region;
    for (let url of urlsToCrawl) {
        switch (url) {
            case 'https://pasgo.vn/ha-noi/nha-hang/': region = "Hà Nội"; break;
            case 'https://pasgo.vn/ho-chi-minh/nha-hang/': region = "Hồ Chí Minh"; break;
            case 'https://pasgo.vn/da-nang/nha-hang/': region = "Đà Nẵng"; break;
            case 'https://pasgo.vn/khanh-hoa/nha-hang/': region = "Khánh Hòa"; break;
        }


        await page.goto(url);

        let scrapePage = async (region) => {
            let data = await page.evaluate(async (region) => {
                let restaurants = [];
                let restaurant_cards = document.querySelectorAll(".wapfoody .wapitem");
                // restaurant_cards.forEach((item) => {
                for (let item of restaurant_cards) {
                    // let item = restaurant_cards[0];
                    let dataJson = {};
                    try {
                        dataJson.region = region;
                        dataJson.name = item.querySelector(".tags-group>.wapfooter>a").innerText.trim();
                        dataJson.srcImg = item.querySelector("a.waptop>img").src.trim();
                        dataJson.address = item.querySelector(".tags-group>.wapfooter .text-address").innerText.trim();
                        dataJson.link = item.querySelector(".tags-group>.wapfooter>a").getAttribute('href').trim();

                       
                        // dataJson.srcImg = srcImg;

                        // linkElm.target = "_self";
                        // await linkElm.click();
                        // console.log('cccc');
                        // await page.waitForSelector(".pago-thongtin-tomtat>.pickup-title .pasgo-giatrungbinh");
                        // await Promise.all(
                        //     browser.newPage().then(async newPage => {
                        //         await newPage.goto(linkElm.getAttribute('href').trim());
                        //         let price = await newPage.evaluate(() => {
                        //             return document.querySelector(".pago-thongtin-tomtat>.pickup-title .pasgo-giatrungbinh").innerText;
                        //             // console.log('chay');
                        //         })
                        //         dataJson.price = 'j';
                        //     })
                        // )
                        // dataJson.price = 'k';

                        // let priceElement = document.querySelector(".pago-thongtin-tomtat>.pickup-title .pasgo-giatrungbinh");
                        // console.log(priceElement);
                        // if (priceElement) {
                        //     // debugger;
                        //     // let priceText = await newPage.evaluate(el => el.innerText, priceElement);
                        //     dataJson.price = 'có';
                        // } else {
                        //     dataJson.price = "Không có thông tin";
                        // }
                        // await page.goBack();
                        // console.log('Navigated back');


                    }

                    catch (err) {
                        console.log(err);
                    }
                    restaurants.push(dataJson);
                };

                return restaurants;
            }, region);

            await Promise.all(data.map(item => download.image({
                url: item.srcImg,
                dest: __dirname + '/img'
            })));
        
            
            const maxConcurrentPages = 5;

            const chunkedData = Array.from(
                { length: Math.ceil(data.length / maxConcurrentPages) },
                (v, i) => data.slice(i * maxConcurrentPages, (i + 1) * maxConcurrentPages)
            );


            

            // Lặp qua từng nhóm và mở trang trong từng nhóm
            for (const chunk of chunkedData) {
                await Promise.all(
                    chunk.map(async (item) => {
                        try {
                            const page = await browser.newPage();
                            await page.goto(item.link);

                            // Sử dụng page.waitForSelector để chờ phần tử xuất hiện
                            const selector = ".pago-thongtin-tomtat > .pickup-title .pasgo-giatrungbinh";
                            await page.waitForSelector(selector, { visible: true, timeout: 0 }); // Thời gian chờ có thể điều chỉnh

                            // Sử dụng page.$eval để trực tiếp lấy giá trị và tránh việc kiểm tra null
                            const price = await page.$eval(selector, (element) => element.innerText);

                            // Đóng trang sau khi đã sử dụng
                            await page.close();

                            item.price = price.trim() || "Không có thông tin giá"; // Kiểm tra và gán giá trị mặc định nếu là chuỗi trống
                        } catch (err) {
                            console.error(err);
                            item.price = "Không có thông tin giá";
                        }
                    })
                );
            }


            const output = data.map(obj => {
                // Destructuring object để tạo bản sao mới không chứa keyToRemove
                const { "link": removedKey, ...rest } = obj;
                return rest;
            });
            // fs.appendFile("restaurants.json", JSON.stringify(output, null, 2), 'utf-8', (err) => {
            //     if (err) {
            //         console.error("Lỗi ghi vào tệp:", err);
            //     } else {
            //         console.log("Dữ liệu đã được lưu vào tệp restaurants.json");
            //     }
            // });
            return output;

        };

        // Lấy dữ liệu từ trang đầu tiên
        let electronicData = await scrapePage(region);
        console.log(1, electronicData.length);
        electronicData.forEach((item) => console.log(item.name, item.name2, item.price))


        let hasNextPage = await page.evaluate(() => {
            const nextButton = document.querySelector(".navigation>.pagination>li>a[rel='next']");
            if (nextButton) {
                nextButton.click();
                return true;
            }
            return false;
        });

        // Check có list trang hay không thì click và lấy dữ liệu tiếp 
        let count = 1;
        while (hasNextPage) {
            await page.waitForSelector(".wapfoody .wapitem", { visible: true, timeout: 0 });
            const newData = await scrapePage(region);
            electronicData = electronicData.concat(newData);
            count++;
            console.log(count, newData.length);
            newData.forEach((item) => console.log(item.name, item.name2, item.price))
            hasNextPage = await page.evaluate(() => {
                const nextButton1 = document.querySelector(".navigation>.pagination>li>a[rel='next']");
                if (nextButton1) {
                    nextButton1.click();
                    return true;
                }
                return false;
            });
        }

        allElectronicData.push(...electronicData);
        // console.log(region, electronicData);
    }
    fs.writeFile("restaurants.json", JSON.stringify(allElectronicData, null, 2), 'utf-8', (err) => {
        if (err) {
            console.error(">>>>>>>>>>Lỗi ghi vào tệp:", err);
        } else {
            console.log(">>>>>>>>>Dữ liệu đã được lưu vào tệp restaurants.json");
        }
    });
    await browser.close();

})();
