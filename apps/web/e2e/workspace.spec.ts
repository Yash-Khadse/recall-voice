import {test,expect} from '@playwright/test';
test('unconfigured deployment never pretends voice is live',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:/A conversation/})).toBeVisible();
 await expect(page.getByText('Setup required',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Try Voice Agent'}).click();
 await expect(page.getByRole('alert').filter({hasText:'Cloud accounts'})).toContainText('not configured');
 await expect(page.getByText('Unavailable',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Enable microphone'})).toBeDisabled();
 await page.screenshot({path:`test-results/${test.info().project.name}-conversation.png`,fullPage:true});
});
test('navigation, privacy and responsive layout',async({page})=>{
 await page.goto('/');await page.screenshot({path:`test-results/${test.info().project.name}-overview.png`,fullPage:true});
 await page.getByRole('button',{name:'Memory',exact:true}).click();
 await expect(page.getByRole('heading',{name:'A little context, kept.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Export JSON'})).toBeDisabled();
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Privacy by default'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
