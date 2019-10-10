var cursorPos = [0,0,0];
function main(){
	const canvas = document.getElementById("glCanvas");
	const gl = canvas.getContext("webgl");

	if(gl == null){
		alert("Could not initialize WebGL");
		return;
	}

	const vsSource = `
		attribute vec4 aPosition;
	
		uniform mat4 uModelViewMatrix;
		uniform mat4 uProjectionMatrix;
		uniform vec4 uColor;
		
		varying lowp vec4 vColor;
		
		void main(){
			gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
			vColor = uColor;
		}
	`;
	const fsSource = `
		varying lowp vec4 vColor;
		
		void main(){
			gl_FragColor = vColor;
		}
	`;

	//Draw Box Outline
	const borderBuffers = initBuffers(gl, [1.0,1.0,1.0,1.0,1.0,-1.0,1.0,-1.0,1.0,1.0,-1.0,-1.0,-1.0,1.0,1.0,-1.0,1.0,-1.0,-1.0,-1.0,1.0,-1.0,-1.0,-1.0], [0,1,0,2,0,4,1,3,1,5,2,3,2,6,3,7,4,5,4,6,5,7,6,7], gl.STATIC_DRAW);
	const borderShader = initShaderProgram(gl, vsSource, fsSource, [0.0,1.0,0.0,1.0]);
	//Draw Cursor
	const cursorBuffers = initBuffers(gl, [0.1,0.0,0.0,-0.1,0.0,0.0,0.0,0.1,0.0,0.0,-0.1,0.0,0.0,0.0,0.1,0.0,0.0,-0.1], [0,1,2,3,4,5], gl.STATIC_DRAW);
	const cursorShader = initShaderProgram(gl, vsSource, fsSource, [1.0,1.0,0.3,1.0]);
	
	var then = 0;
	function render(now){
		now *= 0.001;
		const deltaTime = now-then;
		then = now;
		drawScene(gl, borderBuffers, borderShader, cursorBuffers, cursorShader, deltaTime);
		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}

function initShaderProgram(gl, vsSource, fsSource, color){
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
		alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
		return null;
	}
	gl.useProgram(shaderProgram);
	gl.uniform4fv(gl.getUniformLocation(shaderProgram, 'uColor'), color);

	return shaderProgram;
}
function loadShader(gl, type, source){
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		alert('Could not compile shaders: ' + gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function initBuffers(gl, positions, indices, mode){ //mode is either gl.STATIC_DRAW or gl.DYNAMIC_DRAW
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), mode);
	
	const indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), mode);
	return{
		position: positionBuffer,
		indices: indexBuffer
	};
}

function drawScene(gl, borderBuffers, borderShader, cursorBuffers, cursorShader, deltaTime){
	gl.clearColor(0.0,0.0,0.0,1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const projectionMatrix = glMatrix.mat4.create();

	glMatrix.mat4.perspective(projectionMatrix, 0.785398, gl.canvas.clientWidth/gl.canvas.clientHeight,0.1,100);
	
	const borderModelViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.translate(borderModelViewMatrix, borderModelViewMatrix, [0,0,-5]);
	const cursorModelViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.translate(cursorModelViewMatrix, borderModelViewMatrix, [0,0,-5]);
	//Draw Border
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, borderBuffers.position);
		gl.vertexAttribPointer(gl.getAttribLocation(borderShader, 'aPosition'), 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(gl.getAttribLocation(borderShader, 'aPosition'));
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, borderBuffers.indices);
	}
	gl.useProgram(borderShader);
	gl.uniformMatrix4fv(gl.getUniformLocation(borderShader, 'uProjectionMatrix'), false, projectionMatrix);
	gl.uniformMatrix4fv(gl.getUniformLocation(borderShader, 'uModelViewMatrix'), false, borderModelViewMatrix);
	{
		gl.drawElements(gl.LINES, 24, gl.UNSIGNED_SHORT, 0);
	}
	//Draw Cursor
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, cursorBuffers.position);
		gl.vertexAttribPointer(gl.getAttribLocation(cursorShader, 'aPosition'), 3, gl.FLOAT, false, 0,0);
		gl.enableVertexAttribArray(gl.getAttribLocation(cursorShader, 'aPosition'));

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cursorBuffers.indices);
	}
	gl.useProgram(cursorShader);
	gl.uniformMatrix4fv(gl.getUniformLocation(cursorShader, 'uProjectionMatrix'), false, projectionMatrix);
	gl.uniformMatrix4fv(gl.getUniformLocation(cursorShader, 'uModelViewMatrix'), false, cursorModelViewMatrix);
	{
		gl.drawElements(gl.LINES, 6, gl.UNSIGNED_SHORT, 0);
	}
}
window.onload = main;
