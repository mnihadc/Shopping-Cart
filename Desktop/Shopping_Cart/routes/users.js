const { response } = require('express');
var express = require('express');
const { resolve } = require('promise');
const { render } = require('../app');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');

const verifyLogin=(req,res,next)=>{
  if(req.session.userloggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/',async function(req, res, next) {
  let user=req.session.user
  console.log(user);
  let cartCount=null
  if(req.session.user){
  cartCount=await userHelpers.getCartCount(req.session.user._id);
  }
  productHelpers.getAllUserProducts().then((products)=>{
    res.render('user/view-product', { products,user,cartCount});
});
});
router.get('/login',(req,res)=>{
  if(req.session.user){
    res.redirect('/')
  }else{
    res.render('user/login',{loginError:req.session.userloginError})
    req.session.userloginError=false
  }
})
router.get('/signup',(req,res)=>{
  res.render('user/signup');
});
router.post('/signup',(req,res)=>{
  userHelpers.doSignup(req.body).then((response)=>{
      req.session.user=response
      req.session.userloggedIn=true
      res.redirect('/');
  }).catch((err)=>{
    console.error('Error signing up:', err);
  })
})
router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){

      req.session.user=response.user 
      req.session.userloggedIn=true
      res.redirect('/');
    }else{
      req.session.userloginError="Invalid username or password";
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.userloggedIn=false
  res.redirect('/')
})
router.get('/cart',verifyLogin,async(req,res)=>{
  let products=await userHelpers.getCartProduct(req.session.user._id)
  if(products.length===0){
    return res.redirect('/')
  }
  let totalValue=await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/cart',{products,user:req.session.user._id,totalValue});
})
router.get('/add-to-cart/:id',(req,res)=>{
  userHelpers.addToCart(req.params.id,req.session.user._id).then((response)=>{
    res.json({status:true})
  })
})
router.post('/update-quantity/',async(req, res) => {
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    response.total=await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
    })
})
router.get('/remove-cart/:cartId/:prodId', (req, res) => {
  const cartId = req.params.cartId;
  const prodId = req.params.prodId;
  userHelpers.removeCartItem(cartId, prodId).then(() => {
    res.sendStatus(200);
  }).catch((error) => {
    console.error(error);
    res.sendStatus(500);
  });
});
router.get('/place-order',verifyLogin,async(req,res)=>{
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user})
})
router.post('/place-order',async(req,res)=>{
  let products=await userHelpers.getCartProductList(req.body.userId)
  let totalPrice=await userHelpers.getTotalAmount(req.body.userId)
  let user=req.session.user
  userHelpers.placeOrder(req.body,products,totalPrice,user).then((response)=>{
    res.json({status:true})
  })
});
router.get('/order-summery', verifyLogin, async (req, res) => {
  let userId = req.session.user._id;
  let orderList = await userHelpers.getUserOrders(userId);
  console.log(orderList);
  res.render('user/order-summery', { user: req.session.user, orderList });
});
router.get('/cancel-order/:id', async (req, res) => {
  let orderId = req.params.id;
  await userHelpers.cancelOrder(orderId);
  res.send({ status: true });
});
router.get('/order-sucess', (req, res) => {
  res.render('user/order-sucess', { disableHeader: true });
});
router.get('/order', verifyLogin, async (req, res) => {
  let userId = req.session.user._id;
  let order = await userHelpers.orderedList(userId);
  if(order.length===0){
    res.redirect('/')
  }
  res.render('user/order', { user: req.session.user, order });
});
router.get('/order-product-view/:orderId',verifyLogin,async(req,res)=>{
  let orderId = req.params.orderId;
  let orderView =await userHelpers.orderProductView(orderId)
  console.log(orderView);
  res.render('user/order-view',{disableHeader: true,orderView,user:req.session.user})
})
router.get('/search',(req,res)=>{
  res.render('user/search',{disableHeader:true})
})
module.exports = router;
