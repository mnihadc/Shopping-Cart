const { resolve, reject } = require('promise');
var db = require('../config/connection')
var bcrypt = require('bcrypt');
var collection = require('../config/collections');
var objectId = require('mongodb').ObjectId
const { response, resource } = require('../app');
module.exports = {

  addProduct: async (products, adminId,callback) => {
    try {
      products.adminId=adminId
      const result = await db.get().collection('products').insertOne(products)
      console.log(result);
      callback(result.insertedId);
    } catch (error) {
      console.error('Error adding product:', error);
    }
  },
  getAllProduct: (adminId) => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({adminId}).toArray()
      resolve(products)
    })
  },
  getAllUserProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
      resolve(products)
    })
  },
  deleteProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new objectId(prodId) }).then((response) => {
        console.log(response);
        resolve(response);
      })
    })
  },
  getproductDetails: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new objectId(prodId) }).then((product) => {
        resolve(product)
      })
    })
  },
  updateProduct: (prodId, proDetails) => {
    return new Promise((resolve, reject) => {
      console.log(proDetails);
      db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: new objectId(prodId) }, {
        $set: {
          name: proDetails.name,
          price: proDetails.price,
          description: proDetails.description,
          category: proDetails.category,
        }
      }).then((response) => {
        resolve()
      })
    })
  },
  getSignup: (adminData) => {
    return new Promise(async (resolve, reject) => {
      adminData.Password = await bcrypt.hash(adminData.Password, 10);
      db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then((response) => {
        console.log(adminData);
        resolve(adminData);
      })
    });
  },
  getLogin:(adminData)=>{
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: adminData.email });
      if (admin) {
        try {
          const status = await bcrypt.compare(adminData.Password, admin.Password);
          if (status) {
            loginStatus = true;
            console.log("Login successful");
            response.admin=admin
            response.status=true
            resolve(response);
          } else {
            console.log("Incorrect password");
            resolve({status:false})      
          }
        } catch (error) {
          console.error("Error comparing passwords:", error);
          resolve({status:false})
        }
      } else {
        console.log("User not found");
        resolve({status:false})
      }
  
      resolve(loginStatus);
    });
  },
  getOrderAdmin:()=>{
    return new Promise(async(resolve,reject)=>{
      let ordersAdmin=await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
      resolve(ordersAdmin)
    })
  },
  orderProAdmin:(orderId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.ORDER_COLLECTION)
      .findOne({ _id: new objectId(orderId) })
      .then((orders) => {
          resolve(orders);
      })
      .catch((error) => {
          reject(error);
      });
    })
  }
};
