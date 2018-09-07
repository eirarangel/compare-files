const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
var path = require('path');
var fs = require('fs');

var githubContent = require('github-content');
var github = require('octonode');

// Nodejs implementations
var diff_match_patch = require('diff-match-patch');
const m = require('text-file-diff');
var jsdiff = require('diff');

const ShopifyAPIClient = require('shopify-api-node');

// Shopify API setup
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_themes, write_themes';
const forwardingAddress = "http://d9baf80e.ngrok.io";
const shopName = 'sidejobs-gazelle.myshopify.com';
const themeId = '14598635585';

/*const redirectUri = forwardingAddress + '/shopify/callback';

const shopify = new Shopify({
    shopName: shopName,
    apiKey: apiKey,
    password: apiSecret
});*/

const shopify = new Shopify({
    shopName: shopName,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN
});

var client = github.client({
    username: 'username',
    password: 'password'
});

var ghrepo = client.repo('qodespace/gazelle-shopify-themes');

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});

// Read theme and get file list
shopify.asset.list(themeId, {fields: 'key'})
.then(files => {
    if(files && files.length) {
        files.forEach(function(f) {
            getShopifyContent(f.key, function(shopifyContent) {
                getGithubFile(f.key, function(githubContent) {
                    if (!compareFiles(shopifyContent, githubContent)) {
                        console.log(f.key);
                    }
                });
            });
        });
    }
})
.catch(err => console.error(err));

// Read file from github
function getGithubFile(fileNamePath, callback) {
    ghrepo.contents('compass/src/' + fileNamePath, function(err, data, headers) {
        callback(Buffer.from(data.content, 'base64').toString("utf8")); //decode base64
    });
}

// Get shopify file content from file name path
function getShopifyContent(fileNamePath, callback) {
    shopify.asset.get(themeId, {key: fileNamePath, limit: 1})
    .then(file => {
        if(file && file.length) {
            file.forEach(function(f) {
                callback(JSON.parse('"' + f.toString() + '"')); //parse unicode
            });
        }
    })
    .catch(err => console.error(err));
}

function compareFiles(remoteContent, shopifyContent) {
    const bufRemote = Buffer.from(remoteContent.replace(/\n/g, ''));
    const bufShopify = Buffer.from(shopifyContent.replace(/\n/g, ''));

    return bufRemote.equals(bufShopify);
}

//Read file from Shopify and Github text file
function readModuleFile(path, type, callback) {
    try {
        var filename = require.resolve(path);
        fs.readFile(filename, function (err, data) {
            if (err) throw err;
            if (type === 'shopify') {
                callback(JSON.parse('"' + data.toString() + '"'));
            } else {
                callback(data.toString());
            }
        });
    } catch (e) {
        callback(e);
    }
}

//Compare files
readModuleFile('./shopify-file.txt', 'shopify', function (shopifyContent) {
    readModuleFile('./remote-file.txt', 'remote', function (remoteContent) {
        const buf1 = Buffer.from(remoteContent.replace(/\n/g, ''));
        const buf3 = Buffer.from(shopifyContent.replace(/\n/g, ''));

        //console.log(buf1.equals(buf3));
       /* var options = {
            owner: 'qodespace',
            repo: 'gazelle-shopify-themes',
            branch: 'master' // defaults to master
        };
          
        var gc = new githubContent(options);
        var readme_uri = 'https://raw.githubusercontent.com/eirarangel/personal-site/gh-pages/index.html';
        gc.file('README.md', function(err, file) {
            if (err) return console.log(err);
            console.log(file.path);
            console.log(file.contents.toString());
        });*/
    });
});
