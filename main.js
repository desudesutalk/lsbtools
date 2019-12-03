"use strict";
/* globals lsbTools, md5, saveAs */
/* jshint browser:true, devel:true */
/* jshint ignore:start */
var md5=function(){function r(){var d="",a;for(a=0;a<this.length;a++)d+=(this[a]>>4).toString(16)+(this[a]&15).toString(16);return d}var g,n=[],p=[];for(g=0;64>g;g++)n.push([738695,669989,770404,703814][g>>4]>>g%4*5&31),p.push(Math.floor(4294967296*Math.abs(Math.sin(1+g))));return function(d){var a=new Uint32Array(4),g=new Uint8Array(a.buffer),c,e,f,h,k,l,m,q,b;a[3]=271733878;a[0]=1732584193;a[1]=~a[3];a[2]=~a[0];if("string"===typeof d){e=[];for(b=f=0;b<d.length;b++)c=d.charCodeAt(b),128>c?e[f++]=c:(2048>c?e[f++]=c>>6|192:(55296==(c&64512)&&b+1<d.length&&56320==(d.charCodeAt(b+1)&64512)?(c=65536+((c&1023)<<10)+(d.charCodeAt(++b)&1023),e[f++]=c>>18|240,e[f++]=c>>12&63|128):e[f++]=c>>12|224,e[f++]=c>>6&63|128),e[f++]=c&63|128);d=Uint8Array.from(e)}c=new ArrayBuffer(64*Math.ceil((d.length+9)/64));b=new Uint8Array(c);c=new Uint32Array(c);b.set(d);b[d.length]=128;c[c.length-2]=8*d.length;for(m=0;m<c.length;m=m+=16){d=a[0];e=a[1];f=a[2];h=a[3];for(b=0;63>=b;b++)16>b?(k=e&f|~e&h,l=b):32>b?(k=e&h|f&~h,l=5*b+1):48>b?(k=e^f^h,l=3*b+5):(k=f^(e|~h),l=7*b),q=h,h=f,f=e,e+=d+k+p[b]+c[m+l%16]<<n[b]|d+k+p[b]+c[m+l%16]>>>32-n[b],d=q;a[0]+=d;a[1]+=e;a[2]+=f;a[3]+=h}g.hex=r;return g}}();
/* jshint ignore:end */

function rndPass() {
	var s = '',
		symbols = ['a', 'ba', 'be', 'bi', 'bo', 'bu', 'bya', 'byo', 'byu', 'cha', 'chi', 'cho',
			'chu', 'da', 'de', 'do', 'e', 'fu', 'ga', 'ge', 'gi', 'go', 'gu', 'gya', 'gyo', 'gyu',
			'ha', 'he', 'hi', 'ho', 'hya', 'hyo', 'hyu', 'ja', 'ji', 'jo', 'ju', 'ke', 'ki', 'kya',
			'kyo', 'ma', 'me', 'mi', 'mo', 'mu', 'mya', 'myo', 'myu', 'na', 'ne', 'ni', 'no', 'nu',
			'nya', 'nyo', 'nyu', 'o', 'pa', 'pe', 'pi', 'po', 'pu', 'pya', 'pyo', 'pyu', 'ra', 're',
			'ri', 'ro', 'ru', 'rya', 'ryo', 'ryu', 'se', 'sha', 'shi', 'sho', 'ta', 'te', 'to', 'tsu',
			'u', 'vu', 'wa', 'we', 'wi', 'wo', 'ya', 'yo', 'yu', 'za', 'ze', 'zo', 'zu', 'zu'];

	for (var i = 0; i < 5; i++) {
		s += symbols[Math.floor(Math.random() * symbols.length)];
	}

	return s;
}

function processLSB(pixels, width, height, argv){
	var log = '', lsbCount = width * height * 3;

	log+='Image size is: '+width+'x'+height;
	log+='\nLSBs count: '+ lsbCount;
	log+='\nMaximum capacity: '+Math.floor(lsbCount/8);

	if(argv.fill){
		lsbTools.fill(pixels, 0);
	}

	var options = {
	    shuffle: argv.shuffle || argv.best,
	    matrix: argv.matrix || argv.best,
	    mask: argv.mask || argv.best,
	    key: md5(argv.password || ''),
	    pm1code: argv.plusminus1 || argv.best
	};

	var data, t, embedMD5, extractMD5, rsBias;

	if(argv.rstest && argv.embed){
		rsBias = lsbTools.rsDetect(pixels, width);

		log+='\nBefore embed:\nRS detected message length: '+(rsBias * 100).toFixed(2)+'% ('+Math.floor(lsbCount * rsBias / 8)+' bytes)';
	}

	if(argv.embed){
		try{
			embedMD5 = md5(argv.data).hex().match(/.{4}/g).join(' ');
		    log+='\n\nEmbedding '+argv.data.length+' bytes';
		    log+='\nmd5: '+embedMD5+'\n';

		    t = lsbTools.write(pixels, argv.data, options);

		    log+='\n'+t.bitsWrited+' bits of data was written\n'+(100 * t.bitsWrited / lsbCount).toFixed(2)+'% of maximum capacity';
		    if(t.k > 1) log+='\n'+t.k+','+t.n+' codes used';
		    log+='\n'+t.bitsChanged+' image bits was changed.\nThis is '+(100 * t.bitsChanged / lsbCount).toFixed(2)+'% of all LSBs.';
		    log+='\nEfficiency: '+(t.bitsWrited / t.bitsChanged).toFixed(2)+' bits per one LSB change.';
		}catch(e){
			log+='\nData will not fit. Skipping embeding.';
		}
	}

	if(argv.extract){
		data = lsbTools.read(pixels, options);
		extractMD5 = md5(data).hex().match(/.{4}/g).join(' ');

	    log+='\n\n'+data.length+' bytes was extracted';
	    log+='\n'+(100 * 8 * (data.length + 4.5) / lsbCount).toFixed(2)+'% of capacity was used';
	    log+='\nmd5: ' + extractMD5 + (embedMD5? extractMD5==embedMD5?' (ok)':' (FAIL!)':'');
	}

	if(argv.rstest === true){
		t = lsbTools.rsDetect(pixels, width);

		log+='\n\nRS detected message length: '+(t * 100).toFixed(2)+'% ('+Math.floor(lsbCount * t / 8)+' bytes)';
		if(argv.embed){
			t-=rsBias;
			log+='\n\n                 corrected: '+(t * 100).toFixed(2)+'% ('+Math.floor(lsbCount * t / 8)+' bytes)';
		}
	}

	if(argv.chitest){
		t = lsbTools.chiAttack(pixels, width, argv.enhance);

		log += '\n\nChi-squared detected message length: '+Math.floor(t/8)+' bytes ('+(100*t / lsbCount).toFixed(2)+'%)';
	}

	if(!argv.chitest && argv.enhance){
		t = lsbTools.enhance(pixels);
	}

	return {log:log, data:data};
}

if(!localStorage.password) localStorage.password = rndPass();
document.querySelector('input[name="passwd"]').value = localStorage.password;

var srcImg = document.createElement('img'),
	srcCanvas = document.createElement('canvas'), srcCtx = srcCanvas.getContext('2d'),
	destCanvas = document.getElementById('preview'), destCtx = destCanvas.getContext('2d'),
	container = null,
	embeddata = null;

function savePassword() {
	localStorage.password = document.querySelector('input[name="passwd"]').value;
}

srcImg.onload = function(){
	srcCanvas.width = destCanvas.width = srcImg.width;
	srcCanvas.height = destCanvas.height = srcImg.height;
	srcCtx.drawImage(srcImg, 0, 0);
	container = true;
	setZoom();
	processImage(false);
};

function processImage(extract){
	if(!container){
		document.getElementById('process-log').textContent = '';
		return false;
	}
	var options = {
		'fill': 		document.getElementById('image-clear').checked,
		'rstest': 		document.getElementById('image-rs').checked,
		'enhance': 		document.getElementById('image-enhance').checked,
		'chitest': 		document.getElementById('image-chi').checked,
		'shuffle': 		document.getElementById('data-shuffle').checked,
		'matrix': 		document.getElementById('data-matrix').checked,
		'mask': 		document.getElementById('data-mask').checked,
		'plusminus1': 	document.getElementById('data-pm1').checked,
		'password':     document.querySelector('input[name="passwd"]').value,
		'embed': false,
		'extract': extract
	};

	if(embeddata){
		options.embed = true;
		options.data = embeddata;
	}

	var pixels = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

	var res = processLSB(pixels.data, pixels.width, pixels.height, options);

	destCtx.putImageData(pixels, 0, 0);
	document.getElementById('process-log').textContent = res.log;

	return res;
}

var handleContainerSelect = function(evt) {
	container = null;

	var files = evt.target.files; // FileList object

	if (files[0] && files[0].type.match('image/.*')) {
		var reader = new FileReader();

		reader.onload = function(e) {
				srcImg.src = e.target.result;
			};
		reader.readAsDataURL(files[0]);
	} else {
		alert('Please select image!');
		document.querySelector('#image-select').value = null;
		processImage(false);
	}
};

function concatBuffer( buffer1, buffer2 ) {
  var tmp = new Uint8Array( buffer1.byteLength + buffer2.byteLength );
  tmp.set( new Uint8Array( buffer1 ), 0 );
  tmp.set( new Uint8Array( buffer2 ), buffer1.byteLength );
  //tmp = tmp.slice(0, 256);
  return tmp.buffer;
}

var max_filename_bytes = 256;		//default limit for pathway will be 256 bytes.

var handleDataSelect = function(evt) {
	embeddata = null;

	var files = evt.target.files; // FileList object
	var reader = new FileReader();
	if (files[0]){
		var name = new Uint8Array(max_filename_bytes);									//max filename size will be max_filename_bytes bytes
		name.set(
			(new TextEncoder())		//Using TextEncoder
			.encode(				//encode to Uint8Array
				files[0].name			//string with uploaded filename
			)
									//and add this
		); 							//to previous Uint8Array, by filling this.
		//console.log("name", name);	//show this uint8array (test)

		reader.onload = function(e) {
				//embeddata = new Uint8Array(e.target.result);								//old code
				embeddata = new Uint8Array(
					concatBuffer(			//join two arrayBuffers
						e.target.result,	//array with data-buffer
						name.buffer			//and add filename as +max_filename_bytes bytes in the end (the rest filled by null-byte).
					)
				);
				processImage(false);
			};
		reader.readAsArrayBuffer(files[0]);
	}else{
		processImage(false);
	}
};

var doExtract = function() {
	var data = processImage(true).data;
	
	console.log("data", data);
	var filename =
		(
			(new TextDecoder())			//using TextDecoder
			.decode(					//decode to string
				data.slice(				//last max_filename_bytes bytes from extracted data
					data.length-max_filename_bytes,	//from this offset
					data.length			//up to end
				)
			)
		)
		.replace(/\0.*$/g,'')			//and replace all null-bytes characters '\0'
	;

	data = data.slice(0, data.length-max_filename_bytes);	//use data, exclude last max_filename_bytes bytes.

	var blob = new Blob([data], {type: "application/octet-stream"});

//	saveAs(blob, Date.now() + '.data');	//old code

	saveAs(blob, filename);		//save file, with filename
};

document.getElementById('image-select').onchange = handleContainerSelect;
document.getElementById('data-select').onchange = handleDataSelect;

document.getElementById('embed-remove').onclick = function(){
	embeddata = null;
	document.querySelector('#data-select').value = null;
	processImage(false);
};

document.getElementById('extract-data').onclick = doExtract;
document.getElementById('save-result').onclick = function(){
	destCanvas.toBlob(function(blob) {
	  saveAs(blob, Date.now() + '.png');
	});
};


document.querySelector('input[name="passwd"]').onchange = savePassword;

function reprocess(){processImage();}

document.getElementById('image-clear').onchange = reprocess;
document.getElementById('image-rs').onchange = reprocess;
document.getElementById('image-enhance').onchange = reprocess;
document.getElementById('image-chi').onchange = reprocess;
document.getElementById('data-shuffle').onchange = reprocess;
document.getElementById('data-matrix').onchange = reprocess;
document.getElementById('data-mask').onchange = reprocess;
document.getElementById('data-pm1').onchange = reprocess;


var zooms = [0.0625,0.12,0.25,0.5,1, 2, 3,4, 5, 6];
function setZoom(){
	var level = document.getElementById('zoom').value;

	document.getElementById('zoom-value').textContent = (zooms[level]*100)+'%';

	destCanvas.style['max-width'] = Math.round(srcImg.width * zooms[level]) + 'px';
	destCanvas.style['min-width'] = Math.round(srcImg.width * zooms[level]) + 'px';

	if(zooms[level] > 1){
		destCanvas.classList.add('crisp');
	}else{
		destCanvas.classList.remove('crisp');
	}
}

document.getElementById('zoom').oninput = setZoom;

document.getElementById('outputdiv').addEventListener("wheel", function(e){
	e.preventDefault();
	if(e.deltaY < 0){
		if(document.getElementById('zoom').value < 9){
			document.getElementById('zoom').value++;
			setZoom();
		}
	}else{
		if(document.getElementById('zoom').value > 0){
			document.getElementById('zoom').value--;
			setZoom();
		}
	}
});


var canvasPan = false, startCoords = [], panDiv = document.getElementById('imgview');

destCanvas.onmousedown = function(e){
    canvasPan = true;
    startCoords = [e.offsetX, e.offsetY];
};

destCanvas.onmouseup = function(){
    canvasPan = false;
};

destCanvas.onmousemove = function(e){
    if(!canvasPan) return;
    panDiv.scrollTop -= e.movementY;
    panDiv.scrollLeft -= e.movementX;
};



