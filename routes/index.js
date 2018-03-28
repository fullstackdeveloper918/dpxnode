var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });
//first add the reference to the controller
var controller = require('../controller');
var fs = require('fs');
/* GET home page. */
router.get('/', controller.home);
router.get('/login', controller.login);
router.get('/login', controller.login);
router.get('/upload-file', (req, res) => {
  res.render('uploadfile')
});
router.post('/store', controller.store);
router.get('/downloadfile', (req, res) => {
  res.render('download')
});
router.get('/deletefile', (req, res) => {
  res.render('deletefile')
});
router.post('/download', controller.download);
router.post('/deletefile', controller.deletefile);
router.get('/oauthredirect',controller.oauthredirect);
router.get('/:file(*)', function(req, res, next){ // this routes all types of file
  var path=require('path');
  var file = req.params.file;
  var path = path.resolve(".")+'/downloads/'+file;
  res.download(path); // magic of download fuction
 // fs.unlinkSync(path);

});
module.exports = router;
