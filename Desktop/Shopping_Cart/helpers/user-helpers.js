var db = require('../config/connection')
var collection = require('../config/collections')
var bcrypt = require('bcrypt');
const { resolve, reject } = require('promise');
const { response } = require('../app');
const { cp } = require('fs');
const { CART_COLLECTION } = require('../config/collections');
const { promiseHooks } = require('v8');
var objectId = require('mongodb').ObjectId

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {

      userData.Password = await bcrypt.hash(userData.Password, 10);
      db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((response) => {
        console.log(userData);
        resolve(userData);
      })
    });
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email });
      if (user) {
        try {
          const status = await bcrypt.compare(userData.Password, user.Password);
          if (status) {
            loginStatus = true;
            console.log("Login successful");
            response.user = user
            response.status = true
            resolve(response);
          } else {
            console.log("Incorrect password");
            resolve({ status: false })
          }
        } catch (error) {
          console.error("Error comparing passwords:", error);
          resolve({ status: false })
        }
      } else {
        console.log("User not found");
        resolve({ status: false })
      }

      resolve(loginStatus);
    });
  },
  addToCart: async (proId, userId) => {
    let proObj = {
      item: new objectId(proId),
      quantity: 1
    };
    let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new objectId(proId) });
    if (product) {
      proObj.price = product.price;
      proObj.name = product.name;
    }
    return new Promise(async (resolve, reject) => {
      let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })
      if (userCart) {
        let proExist = userCart.products.findIndex(product => product.item == proId)
        console.log(proExist);
        if (proExist != -1) {
          db.get().collection(collection.CART_COLLECTION)
            .updateOne({ user: new objectId(userId), 'products.item': new objectId(proId) },
              {
                $inc: { 'products.$.quantity': 1 }
              }
            ).then(() => {
              resolve()
            })
        } else {
          db.get().collection(collection.CART_COLLECTION)
            .updateOne({ user: new objectId(userId) },
              {
                $push: { products: proObj }

              }).then((response) => {
                resolve()
              })
        }
      } else {
        let cartobj = {
          user: new objectId(userId),
          products: [proObj]
        }
        db.get().collection(collection.CART_COLLECTION).insertOne(cartobj).then((response) => {
          resolve()
        })
      }
    })
  },
  getCartProduct: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: new objectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: ({ $arrayElemAt: ['$product', 0] })
          }
        }
      ]).toArray()
      resolve(cartItems)
    })
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })
      if (cart) {
        count = cart.products.length
      }
      resolve(count)
    })
  },
  changeProductQuantity: async (details) => {
    details.count = parseInt(details.count);
    return new Promise((resolve, reject) => {
      db.get().collection(collection.CART_COLLECTION).updateOne(
        {
          _id: new objectId(details.cart),
          'products.item': new objectId(details.product),
        },
        {
          $inc: { 'products.$.quantity': details.count }
        }
      ).then((response) => {
        console.log(response);
        resolve(response)
      })
    })
  },
  removeCartItem: (cartId, prodId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.CART_COLLECTION).updateOne(
        { _id: new objectId(cartId) },
        { $pull: { products: { item: new objectId(prodId) } } }
      ).then((response) => {
        console.log(response);
        resolve(response);
      }).catch((error) => {
        console.error(error);
        reject(error);
      });
    });
  },
  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: new objectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: ({ $arrayElemAt: ['$product', 0] })
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }
          }
        }
      ]).toArray()
      resolve(total[0].total)
    })
  },
  placeOrder: (order, products, total, user) => {
    return new Promise((resolve, reject) => {
      console.log(order, products, total);
      let status = order['payment-method'] === 'cod' ? 'placed' : 'pending'
      let orderDate = new Date();
      let deliveredDate = new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      deliveredDate.setHours(0, 0, 0, 0);
      let options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };

      let orderObj = {
        deliveryDetails: {
          mobile: order.mobile,
          address: order.address,
          pincode: order.pincode,
          orderDate: orderDate.toLocaleDateString('en-US', options),
          deliveredDate: deliveredDate.toLocaleDateString('en-US', options)
        },
        user: user.name,
        userId: new objectId(order.userId),
        paymentMethod: order['payment-method'],
        products: products,
        totalAmount: total,
        status: status
      }

      db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
        db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new objectId(order.userId) });
        resolve();
      })
    })
  },
  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new objectId(userId) })
      resolve(cart.products)
    })
  },
  getUserOrders: (userId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ORDER_COLLECTION)
        .find({ userId: new objectId(userId) })
        .sort({ _id: -1 })
        .limit(1)
        .toArray()
        .then((orders) => {
          resolve(orders[0]);

        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  cancelOrder: (orderId) => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(collection.ORDER_COLLECTION).deleteOne({ _id: new objectId(orderId) });
      resolve();
    });
  },
  orderedList: (userId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ORDER_COLLECTION)
        .find({ userId: new objectId(userId) })
        .sort({ _id: -1 })
        .toArray()
        .then((orders) => {
          resolve(orders); // Resolve the entire array
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
  orderProductView: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.ORDER_COLLECTION)
        .findOne({ _id: new objectId(orderId) })
        .then((orders) => {
          resolve(orders);
        })
        .catch((error) => {
          reject(error);
        });
    })
  },
  searchProducts: async (query) => {
    console.log(query);

    // Check if the query is a valid ObjectId before using it
    let objectIdQuery = null;
    if (/^[0-9a-fA-F]{24}$/.test(query)) {
      objectIdQuery = new objectId(query);
    }
  
    const products = await db.get().collection(collection.PRODUCT_COLLECTION)
      .find({
        $or: [
          { _id: objectIdQuery },
          { name: { $regex: query, $options: 'i' } } // Case-insensitive search
        ]
      })
      .toArray();

    return products; 
  },
  getAllProducts: () => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).find().toArray((err, products) => {
        if (err) {
          reject(err);
        } else {
          resolve(products);
        }
      });
    });
  }

};

