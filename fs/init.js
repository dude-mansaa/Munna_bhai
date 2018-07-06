load('api_file.js');
load('api_rpc.js');
load('api_sys.js');
load('api_timer.js');  

let read_data=function(file)
{
let clon=File.read(file);
if(clon===null)
{
  return null;
}
return JSON.parse(clon);
};

let write_data=function(file,data)
{ 
File.write(JSON.stringify(data),file);
};

let upd_rollback=function(s){
	print('ugh rolling back');
	File.remove('worker.js');
	File.rename('worker.js.bak', 'worker.js');
	s.status="COMMITED_OK";
	write_data('updater_data.json',s);
	Sys.reboot(5);
};
let upd_commit=function()
{
	let s={
	  files:[],
	  status:"COMMIED_OK"
	};
	write_data("updater_data.json",s);

};
let upd_check=function()
{
	print('Checking for Uncommited Updates');
	let s = read_data('updater_data.json');
	  if(s===null)
	  {
		s={
		  files:[],
		  status:"COMMITED_OK"
		};
		write_data('updater_data.json',s);
	  }
	if(s.status==="COMMITED_OK")
	{
	  print('COMMITED_OK now loading worker');
	}
	else if(s.status==="TO_COMMIT")
	{
	  print('Seems like changes to be commited');
	  File.rename('worker.js', 'worker.js.bak');
	  File.rename('worker.js.new', 'worker.js');
	  Timer.set(10000  , 0, function() {
		  s = read_data('updater_data.json');
		  if(s.status==="COMMIED_OK"){
			print('Seems all went ok');
		  }
		  else{
		   upd_rollback(s);
		  }
        },null);
	}
	else{
	  print('not sure about status now loading worker'); 
	}
  return s;
};

let callback=null;
let download=function(url,name,_callback){
    callback=_callback;
    let args={"url": url, "file": name};
    File.remove(name);
    RPC.call(RPC.LOCAL,'Fetch',args,function(res){
    	print('Download Res',JSON.stringify(res));
    	callback(res);
    	return true;
    });
};

let s=upd_check();
load('worker.js');

let size; let fname;
RPC.addHandler('update',function(args){
  size=args.size;
  fname=args.name;
  fname="worker.js.new";
  
  download(args.url,fname,function(res){
    if(res!==null)
    {
      let s={
        files:[{
        file_o:fname,
        file_n:fname+".new" 
      }],
      status:"TO_COMMIT"
      };   
      write_data("updater_data.json",s);
      print('File Updated...Rebooting now');
		Sys.reboot(5);
    }
    else{
      print('Failed');
    } 
  });
  return {"result":"Update started !"};
});

RPC.addHandler('downloadFile',function(args){
  let url=args.url;
  let name=args.name; 
  download(url,name,function(args){
    print('dwd done...rebooting');
    Sys.reboot(5);
  });
  return {"result":"File Download Start!"};
});