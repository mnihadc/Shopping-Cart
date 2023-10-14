const { response } = require('express');
var express = require('express');
const { render } = require('../app');
const { resolve } = require('promise');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');

const verfiyLogins = (req, res, next) => {
  if (req.session.adminloggedIn) {
    next();
  } else {
    res.redirect('/admin/login-admin')
  }
}
router.get('/',verfiyLogins,function (req, res, next) {
    let admins = req.session.admin
    adminId=req.session.admin._id
    productHelpers.getAllProduct(adminId).then((products) => {
      res.render('admin/view-products', { admins, products, admin: true });
    })
});

router.get('/login-admin', (req, res) => {
  if (req.session.admin) {
    res.redirect('/')
  } else {
    res.render('admin/login-admin', { admin: true, loginError: req.session.adminloginError })
    req.session.adminloginError = false
  }
})
router.get('/signup', (req, res) => {
  res.render('admin/signup', { admin: true })
})
router.post('/signup', (req, res) => {
  productHelpers.getSignup(req.body).then((response) => {
    req.session.admin = response;
    req.session.adminloggedIn = true;
    res.redirect('/admin/');
  }).catch((err) => {
    console.error('Error signing up:', err);
  });
});
router.post('/login-admin', (req, res) => {
  productHelpers.getLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin;
      req.session.adminId = response.admin._id; 
      req.session.adminloggedIn = true;
      res.redirect('/admin/');
    } else {
      req.session.adminloginError = "Invalid username or password";
      res.redirect('/admin/login-admin');
    }
  });
});
router.get('/logout-admin', (req, res) => {
  req.session.admin = null
  req.session.adminloggedIn = false
  res.redirect('/admin/');

})

router.get('/add-product', (req, res) => {
  res.render('admin/add-product', { admin: true });
});
router.post('/add-product', (req, res) => {
  console.log(req.body);
  let adminId=req.session.admin._id
  console.log(adminId);
  productHelpers.addProduct(req.body,adminId, (insertedId) => {
    let image = req.files.Image
    console.log(insertedId)
    image.mv('./public/product-images/' + insertedId + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-product',{admin:true});
      } else {
        console.log(err);
      }
    })
  })
})
router.get('/delete-product/:id', (req, res) => {
  let proId = req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/')
  })
})
router.get('/edit-product/:id', async (req, res) => {
  let product = await productHelpers.getproductDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-product', { product, admin: true })
})
router.post('/edit-product/:id', (req, res) => {
  console.log(req.params.id);
  let insertedId = req.params.id
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin')

    if (req.files) {
      let image = req.files.Image
      image.mv('./public/product-images/' + insertedId + '.jpg')
    }
  })
})
router.get('/order-users',verfiyLogins,(req,res)=>{
  productHelpers.getOrderAdmin().then((ordersAdmin)=>{
    console.log(ordersAdmin);
    res.render('admin/order-users',{admins:req.session.admin,ordersAdmin,admin:true})
  })
})
router.get('/view-orders/:orderId',verfiyLogins,async(req,res)=>{
  let orderId = req.params.orderId;
  let orderProduct=await productHelpers.orderProAdmin(orderId)
    res.render('admin/view-orders',{disableHeader: true,orderId,orderProduct,user:req.session.user})
  })
module.exports = router;
