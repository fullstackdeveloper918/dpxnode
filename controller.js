const 
crypto = require('crypto'),
config = require('./config'),
polyfil= require('es6-promise').polyfill(),
isom = require('isomorphic-fetch'),
NodeCache = require( "node-cache" ),
dropboxV2Api = require('dropbox-v2-api'),
rp = require('request-promise');
var Dropbox = require('dropbox').Dropbox;
var mycache = new NodeCache();
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });
var fs = require('fs');
var path = require('path');
var mime = require('mime');
//steps 1,2,3
module.exports.home = async (req,res,next)=>{    
  let token = mycache.get("aTempTokenKey");
  if(token){
	var dbx = new Dropbox({ accessToken: token });
		dbx.filesListFolder({path: ''})
		  .then(function(response) {
			  var paths = response.entries.map(function (entry) {
		  return entry;
		});
     	//console.log(paths);
    //return a cursor only if there are more files in the current folder
		let result= {};
		result.names= paths;
		if(response.hasmore) result.cursor= response.cursor;        
			res.render('list', { lists: result, layout:false});
		  })
		  .catch(function(error) {
			console.log(error);
		 });
    /* try{
      let paths = await getLinksAsync(token); 
      res.render('listfiles', { files: paths, layout:false});
    }catch(error){
      return next(new Error("Error getting images from Dropbox"));
    } */
  }else{
  	res.redirect('/login');
  }
}  

//steps 4,5,6
module.exports.login = (req,res,next)=>{

  //create a random state value
  let state = crypto.randomBytes(16).toString('hex');

  //Save state and temporarysession for 10 mins
  mycache.set(state, "aTempSessionValue", 600);

  let dbxRedirect= config.DBX_OAUTH_DOMAIN 
  + config.DBX_OAUTH_PATH 
  + "?response_type=code&client_id="+config.DBX_APP_KEY
  + "&redirect_uri="+config.OAUTH_REDIRECT_URL 
  + "&state="+state;
  
  res.redirect(dbxRedirect);
}
/*--- function to upload files to dropbox-----*/
module.exports.store = (req,res,next)=>{
	var upl=upload.any();
	let token = mycache.get("aTempTokenKey");
		upl(req, res, function(err) {
		let dropbox = dropboxV2Api.authenticate({
				token: token
			});
		var filedata= req.files[0];
			console.log(filedata);	
		dropbox({
			resource: 'files/upload',
			parameters: {
			path:'/' + filedata.originalname
			},
			readStream: fs.createReadStream(filedata.path)
			}, (err, result, response) => {
			//upload completed
			console.log('file got uploaded succesfully to dropbox. Please check the list');
				fs.unlinkSync(filedata.path);
				res.redirect('/');
		     });
		});
}
/*--- function to download files by using dropbox apis-----*/
module.exports.download = (req,res,next)=>{
	let token = mycache.get("aTempTokenKey");
    let dropbox = dropboxV2Api.authenticate({
			token: token
		});
	var dbx = new Dropbox({ accessToken: token });
	var sharedlink = req.body.sharedlink;
		dbx.sharingGetSharedLinkFile({url: sharedlink})
				.then(function(data) {
					//console.log(data);
		dropbox({
			resource: 'files/download',
			parameters: {
				path: data.path_lower
			}
		}, (err, result, response) => {
			//download completed
			//console.log(response);
			
		})
	.pipe(fs.createWriteStream('./downloads/'+ data.name));
	  let filename = data.name;
	  res.set('Content-Type', 'text/html');
	res.send(new Buffer('<div><a href="/">Home</a> | <a href="/upload-file">upload file to dropbox</a> | <a href="/downloadfile">download file from dropbox</a></div><br></br><a href="/' + filename + '">click to download '+ filename + '</a>'));
		})
    .catch(function (err) {
      throw err;
    });
}
/*--- function to delete files by using dropbox apis-----*/
module.exports.deletefile = async (req,res,next)=>{

	let token = mycache.get("aTempTokenKey");
    let dropbox = dropboxV2Api.authenticate({
			token: token
		});
	let path = req.body.path;
	console.log(path);
		dropbox({
			resource: 'files/delete_v2',
			parameters: {
				'path': path
			}
		}, (err, result) => {
			//see docs for `result` parameters
			console.log(result);
			res.redirect('/');
		});
}


//steps 8-12
module.exports.oauthredirect = async (req,res,next)=>{

	if(req.query.error_description){
		return next( new Error(req.query.error_description));
	} 

	let state= req.query.state;
	if(!mycache.get(state)){
		return next(new Error("session expired or invalid state"));
	} 

  //Exchange code for token
  if(req.query.code ){

  	let options={
  		url: config.DBX_API_DOMAIN + config.DBX_TOKEN_PATH, 
      //build query string
      qs: {'code': req.query.code, 
      'grant_type': 'authorization_code', 
      'client_id': config.DBX_APP_KEY, 
      'client_secret':config.DBX_APP_SECRET,
      'redirect_uri':config.OAUTH_REDIRECT_URL}, 
      method: 'POST',
      json: true 
    }

    try{

    	let response = await rp(options);

      //we will replace later cache with a proper storage
      mycache.set("aTempTokenKey", response.access_token, 60);
      res.redirect("/");

    }catch(error){
    	return next(new Error('error getting token. '+error.message));
    }        
  }
}


