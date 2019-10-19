var cursorPos = [0,0,0];
const gridSize = 20;
const particleNum = 2;
var particleTriCount = [];
for(var i = 0; i < particleNum; i++){
	particleTriCount.push(0);
}
var grid = [];
for(var i = 0; i < gridSize-1;i++){
	grid.push([]);
	for(var j = 0; j < gridSize-1; j++){
		grid[i].push([]);
		for(var k = 0; k < gridSize-1; k++){
			grid[i][j].push(0);
		}
	}
}

function main(){
	const particleType = document.getElementById("particleType");
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
	const cSize = 1/gridSize;
	const cursorBuffers = initBuffers(gl, [cSize,0.0,0.0,-cSize,0.0,0.0,0.0,cSize,0.0,0.0,-cSize,0.0,0.0,0.0,cSize,0.0,0.0,-cSize], [0,1,2,3,4,5], gl.STATIC_DRAW);
	const cursorShader = initShaderProgram(gl, vsSource, fsSource, [1.0,1.0,0.3,1.0]);
	//Draw Particles
	const particleBuffers = [];
	const particleShaders = [];
	for(var i = 1; i < particleNum; i++){
		particleBuffers.push(initBuffers(gl, [], [], gl.DYNAMIC_DRAW));
		particleShaders.push(initShaderProgram(gl, vsSource, fsSource, getColor(i)));
	}

	var then = 0;
	function render(now){
		now *= 0.001;
		const deltaTime = now-then;
		then = now;
		drawScene(gl, borderBuffers, borderShader, cursorBuffers, cursorShader, particleBuffers, particleShaders, particleType, deltaTime);
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

function updateBuffers(gl, buffers, positions, indices, mode){
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), mode);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), mode);
}

function drawScene(gl, borderBuffers, borderShader, cursorBuffers, cursorShader, particleBuffers, particleShaders, particleType, deltaTime){
	//TODO: Apply Particle Physics
	
	//Update Particle Meshes
	for(var i = 1; i < particleNum; i++){
		const particleMesh = getMesh(i);
		if(particleTriCount[i] != 0){
			updateBuffers(gl, particleBuffers[i-1], particleMesh.positions, particleMesh.indices, gl.DYNAMIC_DRAW)
		}
	}

	if(particleType != null){
		particleType.innerHTML = "Particle Type: " + getParticleName(grid[cursorPos[0]][cursorPos[1]][cursorPos[2]]);
	}else{
		alert("particleType is Null");
	}

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
	glMatrix.mat4.translate(cursorModelViewMatrix, cursorModelViewMatrix, [-1 + (2/gridSize) + cursorPos[0]*(2/gridSize),-1 + (2/gridSize) + cursorPos[1]*(2/gridSize),-6 + (2/gridSize) + cursorPos[2]*(2/gridSize)]);
	const particleModelViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.translate(particleModelViewMatrix, particleModelViewMatrix, [-1,-1,-5]);
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
	//Draw Particles
	for(var i = 1; i < particleNum; i++){
		if(particleTriCount[i] > 0){
			gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffers[i-1].position);
			gl.vertexAttribPointer(gl.getAttribLocation(particleShaders[i-1], 'aPosition'), 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(gl.getAttribLocation(particleShaders[i-1], 'aPosition'));

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, particleBuffers[i-1].indices);

			gl.useProgram(particleShaders[i-1]);
			gl.uniformMatrix4fv(gl.getUniformLocation(particleShaders[i-1], 'uProjectionMatrix'), false, projectionMatrix);
			gl.uniformMatrix4fv(gl.getUniformLocation(particleShaders[i-1], 'uModelViewMatrix'), false, particleModelViewMatrix);
			{
				gl.drawElements(gl.TRIANGLES, particleTriCount[i], gl.UNSIGNED_SHORT, 0);
			}
		}
	}
}
function getMesh(particle){
	var positionss = [];
	var indicess = [];
	var gridCount = 0;
	const size = 2/gridSize;

	if(particlePhysType(particle) == 1){
		for(var x = 0; x < gridSize - 1; x++){
			for(var y = 0; y < gridSize - 1; y++){
				for(var z = 0; z < gridSize - 1; z++){
					if(grid[x][y][z] == particle){
						if(x+1 == gridSize - 1 || grid[x + 1][y][z] != particle){
							positionss = positionss.concat([
								(size*(x+1)), (size*(y)), -2.5 + (size*(z)), //-Y -Z
								(size*(x+1)), (size*(y+1)), -2.5 + (size*(z)), //+Y -Z
								(size*(x+1)), (size*(y)), -2.5 + (size*(z+1)), //-Y +Z
								(size*(x+1)), (size*(y+1)), -2.5 + (size*(z+1)), //+Y +Z
							]);
							indicess = indicess.concat([gridCount,gridCount+1,gridCount+2,gridCount+1,gridCount+2,gridCount+3]);
							gridCount += 4;
						}
						if(x == 0 || grid[x - 1][y][z] != particle){
							positionss = positionss.concat([
								(size*(x)), (size*(y)), -2.5 + (size*(z)), //-Y -Z
								(size*(x)), (size*(y+1)), -2.5 + (size*(z)), //+Y -Z
								(size*(x)), (size*(y)), -2.5 + (size*(z+1)), //-Y +Z
								(size*(x)), (size*(y+1)), -2.5 + (size*(z+1)), //+Y +Z
							]);
							indicess = indicess.concat([gridCount,gridCount+1,gridCount+2,gridCount+1,gridCount+2,gridCount+3]);
							gridCount += 4;
						}
						if(y+1 == gridSize - 1 || grid[x][y + 1][z] != particle){
							positionss = positionss.concat([
								(size*(x)), (size*(y+1)), -2.5 + (size*(z)), //-X -Z
								(size*(x+1)), (size*(y+1)), -2.5 + (size*(z)), //+X -Z
								(size*(x)), (size*(y+1)), -2.5 + (size*(z+1)), //-X +Z
								(size*(x+1)), (size*(y+1)), -2.5 + (size*(z+1)), //+X +Z
							]);
							indicess = indicess.concat([gridCount,gridCount+1,gridCount+2,gridCount+1,gridCount+2,gridCount+3]);
							gridCount += 4;
						}
						if(y == 0 || grid[x][y - 1][z] != particle){
							positionss = positionss.concat([
								(size*(x)), (size*(y)), -2.5 + (size*(z)), //-X -Z
								(size*(x+1)), (size*(y)), -2.5 + (size*(z)), //+X -Z
								(size*(x)), (size*(y)), -2.5 + (size*(z+1)), //-X +Z
								(size*(x+1)), (size*(y)), -2.5 + (size*(z+1)), //+X +Z
							]);
							indicess = indicess.concat([gridCount,gridCount+1,gridCount+2,gridCount+1,gridCount+2,gridCount+3]);
							gridCount += 4;
						}
						if(z+1 == gridSize - 1 || grid[x][y][z + 1] != particle){
							positionss = positionss.concat([
								(size*(x)), (size*(y)), -2.5 + (size*(z+1)), //-Y -X
								(size*(x)), (size*(y+1)), -2.5 + (size*(z+1)), //+Y -X
								(size*(x+1)), (size*(y)), -2.5 + (size*(z+1)), //-Y +X
								(size*(x+1)), (size*(y+1)), -2.5 + (size*(z+1)), //+Y +X
							]);
							indicess = indicess.concat([gridCount,gridCount+1,gridCount+2,gridCount+1,gridCount+2,gridCount+3]);
							gridCount += 4;
						}
						if(z == 0 || grid[x][y][z - 1] != particle){
							positionss = positionss.concat([
								(size*(x)), (size*(y)), -2.5 + (size*(z)), //-Y -X
								(size*(x)), (size*(y+1)), -2.5 + (size*(z)), //+Y -X
								(size*(x+1)), (size*(y)), -2.5 + (size*(z)), //-Y +X
								(size*(x+1)), (size*(y+1)), -2.5 + (size*(z)), //+Y +X
							]);
							indicess = indicess.concat([gridCount,gridCount+1,gridCount+2,gridCount+1,gridCount+2,gridCount+3]);
							gridCount += 4;
						}
					}
				}
			}
		}
	}
	particleTriCount[particle] = (gridCount/2)*3;
	return{
		positions: positionss,
		indices: indicess
	};
}
function moveCursor(x,y,z){
	cursorPos[0] += (cursorPos[0]+x>=0 && cursorPos[0]+x<gridSize - 1)?x:0;
	cursorPos[1] += (cursorPos[1]+y>=0 && cursorPos[1]+y<gridSize - 1)?y:0;
	cursorPos[2] += (cursorPos[2]+z>=0 && cursorPos[2]+z<gridSize - 1)?z:0;
}
function placeParticle(particle){
	grid[cursorPos[0]][cursorPos[1]][cursorPos[2]] = particle;
}
function getColor(particle){
	if(particle == 0){
		return [0.0,0.0,0.0,1.0];
	}else if(particle == 1){
		return [0.95,0.87,0.33,1.0];
	}
}
function particlePhysType(particle){
	if(particle == 0){
		return 0;
	}else if(particle == 1){
		return 1;
	}
}
function getParticleName(particle){
	if(particle == 1){
		return "Sand";
	}
	return "None";
}
window.onload = main;
