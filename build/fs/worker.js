load('api_net.js');
load('api_pwm.js');
load('api_gpio.js');
load('api_file.js');
load('api_rpc.js');
load('api_config.js');
load('api_sys.js');
load('api_timer.js'); 
load('api_shadow.js');

let red = 4;
let green = 16;
let blue = 5;
let white = 19;
GPIO.set_mode(red,GPIO.MODE_OUTPUT);
GPIO.set_mode(green,GPIO.MODE_OUTPUT);
GPIO.set_mode(blue,GPIO.MODE_OUTPUT);
GPIO.set_mode(white,GPIO.MODE_OUTPUT);
let l = {"r":255,"g":255,"b":255,"w":0};
let s = JSON.stringify(l);
let n = JSON.parse(s);
let prevColor = JSON.parse(s);

let minimum=function(arr) {
  let min = arr[0], max = arr[0];
  for (let i = 1, len=arr.length; i < len; i++) {
    let v = arr[i];
    min = (v < min) ? v : min;
    max = (v > max) ? v : max;
  }
  return  min ;
};

let color = function(prev,args){
	let r,g,b,w=0;
	if(args.r === args.g === args.b){
		w = args.r;
		r =0;
		g =0;
		b =0;
		return animate(prev,r,g,b,w);
	}else{
		let min = minimum([args.r,args.g,args.b]);
		args.r = args.r-min;
		args.g = args.g-min;
		args.b = args.b-min;
	
	
		r = args.r - prev.r;
		g = args.g - prev.g;
		b = args.b - prev.b;
		w = min - prev.w;
		return animate(prev,r,g,b,w);		
	}
};

let step=25;

let animate = function(prev,r,g,b,w){
	for(let i=0 ; i<=step;i++){
		let pp = {r:0,g:0,b:0,w:0};
		pp.r = prev.r + ((r * i)/step);
		pp.g = prev.g + ((g * i)/step);
		pp.b = prev.b + ((b * i)/step);
		pp.w = prev.w + ((w * i)/step);
		PWM.set(red,1000,(pp.r/255));
		PWM.set(green,1000,(pp.g/255));
		PWM.set(blue,1000,(pp.b/255));
		PWM.set(white,1000,(pp.w/255));
		Sys.usleep(5);
		n = {r:0,g:0,b:0,w:0};
		n = pp;
	}
	return n;
};

let doReset = function(){
	let obj = JSON.parse(File.read('conf9.json'));
	if(obj === null){
		Sys.reboot(0);
	}else{
		obj.wifi.sta.enable = false;
		obj.wifi.ap.enable = true;
		obj.bt.enable = true;
		obj.wifi.sta.ssid = "";
		obj.wifi.sta.pass = "";
		File.write(JSON.stringify(obj),'conf9.json');
		print('Reseting device to factory defaults');
		let set = JSON.parse(s);
		set.r = 255;
		set.g = 255;
		set.b = 255;
		last(set);
		Sys.reboot(0);
	}
};

let isReset = function(){
		let reset = check();
		if(reset === 'true'){
			doReset();
		}
};

let check = function(){
	let s = File.read('userData.json');
	let bb = JSON.parse(s);
	Timer.set(10000,false,function(){
		let s = File.read('userData.json');
		let b = JSON.parse(s);
		b.count = 0;
		File.write(JSON.stringify(b),'userData.json');
		print('reseting to count 0');
	},null);
	if(bb.count === 0){
		bb.count = 1;
		File.write(JSON.stringify(bb),'userData.json');
		return 'false';
	}else if(bb.count === 1){
		bb.count = 2;
		File.write(JSON.stringify(bb),'userData.json');
		return 'false';
	}else if(bb.count === 2){
		bb.count = 0;
		File.write(JSON.stringify(bb),'userData.json');
		return 'true';//fix this ,it should not trigger when wifi is not configured.
	}
};

let r,g,b,w=0;
let RED = {"r":255,"g":0,"b":0};
let BLUE = {"r":0,"g":0,"b":255};
let GREEN = {"r":0,"g":255,"b":0};
let WHITE = {"r":0,"g":0,"b":0};
let yellow = {"r" : 255,"g" : 255,"b" : 0};
let Black = {"r" : 0,"g" : 0,"b" : 0,"w":0};
let col = "red";
let st = 0;

let Initcolor = function(){
	
	if(Cfg.get('wifi.sta.enable')===true && Cfg.get('bt.enable')===false){
		Event.addGroupHandler(Net.EVENT_GRP, function(ev, evdata, arg) {  
		let evs = '???';
		if (ev === Net.STATUS_CONNECTING) {
			let res = JSON.parse(GetCurrent());
			prevColor = color(prevColor,res);
			evs = 'CONNECTING';
		}else if (ev === Net.STATUS_GOT_IP) {
			let s = File.read('userData.json');
			let b = JSON.parse(s);
			let res = b.led;
			prevColor = color(prevColor,res);
			evs = 'wbGOT_IP';	
		}
		print('==NEW Net event:', ev, evs);
	},null);
	return prevColor;
 	}
 	
	if(Cfg.get('wifi.sta.enable')===true){
		Event.addGroupHandler(Net.EVENT_GRP, function(ev, evdata, arg) {  
		let evs = '???';
		if (ev === Net.STATUS_CONNECTING) {
			let y = JSON.stringify(yellow);
			let res = JSON.parse(y);
			prevColor = color(prevColor,res);
			evs = 'CONNECTING';
		} 
		else if (ev === Net.STATUS_GOT_IP) {
			let s = File.read('userData.json');
			let b = JSON.parse(s);
			let res = b.led;
			prevColor = color(prevColor,res);
			evs = 'GOT_IP';	
		}
		print('== Net event:', ev, evs);
	},null);
	return prevColor;
 	}
	
	if(Cfg.get('bt.enable')===true){
		if(st === 0){
			st = Blinkb();
			Timer.set(60000,false,function(){
				Timer.del(st);
			},null);
		}else {
			Timer.del(st);
			st = Blinkb();
			Timer.set(60000,false,function(){
				Timer.del(st);
			},null);
		}
		return prevColor;
	}
};

let Blinkb  = function(){ 
	let i = Timer.set(1500,true,function(){
			if(col === "red"){
				col = "green";
				let val = JSON.stringify(RED);
				let res = JSON.parse(val);
				prevColor = color(prevColor,res);
			}else if(col === "green"){
				col = "blue";
				let val = JSON.stringify(GREEN);
				let res = JSON.parse(val);
				prevColor = color(prevColor,res);
			}else if(col === "blue"){
				col = "red";
				let val = JSON.stringify(BLUE);
				let res = JSON.parse(val);
				prevColor = color(prevColor,res);
			}
	},null);
	return i;
};

let last = function(args){
	let s = File.read('userData.json');
	let b = JSON.parse(s);
	b.led.r = args.r;
	b.led.g = args.g;
	b.led.b = args.b;
	File.write(JSON.stringify(b),'userData.json');
};

let GetCurrent = function(){
	let s = File.read('userData.json');
	let b = JSON.parse(s);
	let r = {
			"r": b.led.r,
			"g": b.led.g,
			"b": b.led.b
	};
	return r;
};

let inn = Initcolor();
if(inn !== null){
	l = inn;
}
isReset();  
load('api_mqtt.js'); 

let cronAdd = ffi('int mgos_cron_add(char*, void (*)(userdata, int),userdata)');

let SchedulerCallback = function(arg, job_id){
	let t = Timer.fmt('%I:%M%p %D',Timer.now());
	print('time ',t);
	//read job id from userData.json and perform light function
};

let ScheduleTask = function(args){
	let s = args.s;
	let m = args.m;
	let h = args.h;
	let d = args.d;
	let M = args.M;//by default *
	let w = args.w;
	let data = JSON.stringify(w+" "+M+" "+d+" "+h+" "+m+" "+s);
	print(data+" light"+args.light);
	//cronAdd("* 34 18 * * *",SchedulerCallback,null);
	//make an entry to userData.json to job id and store light data to file 
	return data;
};

Net.serve({
  addr: 'udp://1234',
  ondata: function(conn, data) {
    let hport = Net.ctos(conn, false, true, true);
	if(data === 'Are You A Mansaa Device?'){
	print('Received from:', hport, ':', data);
	Net.send(conn,"I'm Light."+Cfg.get('device.id'));
	}
    Net.discard(conn, data.length);  
  },
});

RPC.addHandler('color',function(args){
	prevColor = color(prevColor,args);
	last(args);
	Shadow.update(0, args);
	return "success";
});

RPC.addHandler('reset',function(){
	doReset();
	return "success";
});

RPC.addHandler('info',function(){
	let rr = GetCurrent();
	let info = {
			"id" : Cfg.get('device.id'),
			"light" :{
				"r" : rr.r,
				"g" : rr.g,
				"b" : rr.b
			},
			"mac":SysInfo.mac,
			"fw_ver":'v1.1',
			"hw_ver":'v1.1'
		};
		return info;
});

RPC.addHandler('schedule',function(args){
	return ScheduleTask(args);
});

let topic1 = Cfg.get('device.id') + '/color';
let pubT = Cfg.get('device.id')+'/status';

MQTT.sub(topic1, function(conn, topic1, msg) {
  print('Topic:', topic1, 'message:', msg);
  let obj = JSON.parse(msg);
  prevColor = color(prevColor,obj);
  last(obj);
  Shadow.update(0, obj);
}, null);

let SysInfo;
RPC.call(RPC.LOCAL,'Sys.GetInfo',null,function(resp,ud){
	SysInfo = resp;
},null);

Shadow.addHandler(function(event, obj) {
  if (event === 'CONNECTED') {
   Shadow.update(0, prevColor);
	return;
  } 
 if (event === 'UPDATE_DELTA') {
    let args = prevColor;
    for (let key in obj) {
      if(key === 'r'){
        args.r = obj.r;
      }else if(key === 'g'){
        args.g = obj.g;
      }else if(key === 'b'){
        args.b = obj.b;
      }
    }
	color(prevColor,args);
	prevColor = args;
	Shadow.update(0, prevColor);
	return;
  }else if (event === 'UPDATE_ACCEPTED'){
    return;
  }
});

let upd_commit=function()
{
	let s={
	  files:[],
	  status:"COMMIED_OK"
	}; 
	File.write(JSON.stringify(s),"updater_data.json");
};
upd_commit();