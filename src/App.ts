import type {
  ThenableWebDriver,
  WebElement,
} from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import {
  Builder,
  Browser,
  By,
  until
} from 'selenium-webdriver';
import { MAIL_LOVE_PLANET, PASSWORD_LOVE_PLANET } from '../env';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';


class App {
  private readonly driver: ThenableWebDriver;
  private readonly url: string = 'https://loveplanet.ru';
  private readonly options: Options;

  constructor() {
    this.options = new Options();
    this.options.addArguments('--start-maximized');
    this.options.addArguments('user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36');
    this.driver = new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(this.options)
      .build();

    this.start();
  }

  private async start(): Promise<void> {
    try {
      await this.logon();
      await this.handle();
    } catch (error) {
      console.log(error);
    } finally {
      await this.driver.quit();
    }
  }

  private finish (): void { throw new Error('finish') }

  private async logon(): Promise<void> {
    await this.driver.get(this.url + '/a-logon');

    const emailInput: WebElement = await this.driver.findElement(By.id('dlg_login_log'));
    const passwordInput: WebElement = await this.driver.findElement(By.id('dlg_login_pas'));

    await emailInput.sendKeys(MAIL_LOVE_PLANET);
    await passwordInput.sendKeys(PASSWORD_LOVE_PLANET);
    await passwordInput.submit();
  }

  private printScreen(): void {
    this.driver.takeScreenshot()
      .then((data: string): void => {
        const base64Data: string = data.replace(/^data:image\/png;base64,/,"")

        fs.writeFile(
          `./src/assets/${uuidv4()}.png`, base64Data,
          'base64',
          (err): void => {
            if(err) console.log(err);
          });
      });
  }

  // after logon, redirected to /, on this page have a need form
  private async handle(): Promise<void> {
    await this.driver.findElement(By.id('city')).submit() // open need page

    for (let i = 0; i < 10; i++) { // scroll to update
      const girls: WebElement[] = await this.driver.wait(until.elementsLocated(By.css('#scroll_block li')));

      for await (const girl of girls) {
        try {
          await this.handleGirl(girl);
        } catch (err) {
          console.log(err);
        }
      }

      await this.driver.executeScript('window.scrollTo(0, document.body.scrollHeight);'); // scroll to update
      await this.driver.sleep(1000);
    }
  }

  private async handleGirl(girl: WebElement): Promise<void> {
    await girl.findElement(By.css('.last-block .btn')).click(); // open modal messenger
    await this.driver.wait(until.elementLocated(By.id('text_area')))
      .sendKeys('Привет, пойдешь со мною на кофе?'); // write message
    await this.driver.findElement(By.id('send_button')).click(); // send message
    await this.driver.sleep(1000); // loading modal for naobka
    await this.naobka();
    await this.driver.sleep(1000); //loading modal for screen
    this.printScreen();
    await this.driver.findElement(By.id('chat_close')).click(); // close modal messenger
  }

  private async naobka(): Promise<void> { // only for unpremium
    await this.driver.executeScript(`
      let messages = document.querySelectorAll('#history_area .chat_locking_history_msg');
      messages.forEach((msg) => {
        msg.parentNode.removeChild(msg);
      });
    `)
  }
}

new App();
