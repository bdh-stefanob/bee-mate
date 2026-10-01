/**
 * @intent  the user adds the item
 */
When("the user adds the item", async function () {
  await shop.add();
});

/**
 * @intent  the user puts the item in the cart
 */
When("the user puts the item in the cart", async function () {
  await shop.add();
});