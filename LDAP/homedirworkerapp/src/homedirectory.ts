const http = require('http');
const fs = require('fs');
const ncp = require('ncp').ncp;
const path = require('path');
import querystring from 'querystring';

if(process.env.UMS_HOSTNAME === undefined || process.env.UMS_HOSTNAME === null)
{
    throw new Error("ERROR: UMS_HOSTNAME Environment variable is not set");

}

// Trampolined variant of recursive directory walk, assumes symlinks & etc. should be treated as files
async function recursiveDirectoryWalk(filepath:string){

  if(!path.isAbsolute(filepath)){
    throw new Error("ERROR: recursiveDirectoryWalk requires an absolute path: " + filepath);
  }

  let todo:string[] = [filepath];
  const files:string[] = [];
  const directories:string[] = [];

  while(todo.length !== 0){
    const stat = await fs.promises.lstat(todo[0]);
    if(stat.isDirectory()){
      const currentDirectory = todo.shift();
      const directoryContents = await fs.promises.readdir(currentDirectory);
      directories.push(currentDirectory);
      todo = todo.concat(directoryContents.map((x:string)=>{
        return path.join(currentDirectory, x);
      }));
    } else {
      files.push(todo.shift());
    }
  }
  return directories.concat(files);
}

async function homeDirPolling(){
    http.get({
    hostname: process.env.UMS_HOSTNAME,
    port: 80,
    path: '/api/homeDirQueue/query',
    agent: false
    }, (res:any) => {

        let output = '';
        res.on("data", (d:any)=>{
          output += d;
        })
        const testUsername = res;


        res.on('end', () => {

          const object = JSON.parse(output);
          if(object.empty === undefined || object.empty === true || object.empty === null){
            return;
          }

          let uid = object.dn.split(',');
          uid = uid[0].split('=')[1];
          const filepath = "/mnt/home/" + uid;
          ncp("/mnt/skel", filepath, async (err:any)=>{
            if(err){
              console.log("ERROR: Tried to copy home directory but something went wrong");
              console.log(err);
            } else {

              const postData = JSON.stringify({
                dn : object.dn
              });

              try {
                const files = await recursiveDirectoryWalk(filepath);
                await Promise.all(files.map((x:string)=>{
                  return fs.promises.chown(x, Number(object.uidNum), 100);
                }));
              } catch (err){
                console.log("ERROR: Tried to change file ownership " + err);

              }

              const options = {
                host: process.env.UMS_HOSTNAME,
                port: 80,
                path: '/api/homeDirQueue/delete',
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': postData.length
                }
              };

              const req:any = http.request(options, (res1:any)=> {
                console.log('statusCode: ', res.statusCode);
                console.log('headers: ', res.headers);
              })
              req.write(postData);
              req.end();
            }

          });




        });




    });

}



setInterval(homeDirPolling, 5000);


// Do the rest of the worker stuff