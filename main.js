var cursorPos = [0,0,0];
const gridSize = 20;
const particleNum = 4;
var particleTriCount = [];
for(var i = 0; i < particleNum; i++){
	particleTriCount.push(0);
}
var grid = [];
for(var i = 0; i < gridSize;i++){
	grid.push([]);
	for(var j = 0; j < gridSize; j++){
		grid[i].push([]);
		for(var k = 0; k < gridSize; k++){
			grid[i][j].push(0);
		}
	}
}
var inertia = [];
for(var i = 0; i < gridSize;i++){
	inertia.push([]);
	for(var j = 0; j < gridSize; j++){
		inertia[i].push([]);
		for(var k = 0; k < gridSize; k++){
			inertia[i][j].push(0);
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
	document.onkeydown = keyPress;
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
	const vsPartSource = `
		attribute vec4 aPosition;
		attribute vec3 aVertexNormal;
	
		uniform mat4 uNormalMatrix;
		uniform mat4 uModelViewMatrix;
		uniform mat4 uProjectionMatrix;
		uniform vec4 uColor;
		
		varying lowp vec4 vColor;
		varying highp vec3 vLighting;
		
		void main(){
			gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
			vColor = uColor;
			//Lighting
			highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
			highp vec3 directionalLightColor = vec3(1, 1, 1);
			highp vec3 directionalVector = normalize(vec3(1,0.25,0.75));

			highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);

			highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
			vLighting = ambientLight + (directionalLightColor * directional);
		}
	`;
	const fsPartSource = `
		varying lowp vec4 vColor;
		varying highp vec3 vLighting;	

		void main(){
			gl_FragColor = vec4(vColor.rgb * vLighting, vColor.a);
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
		particleShaders.push(initShaderProgram(gl, vsPartSource, fsPartSource, getColor(i)));
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
	if(positions.length > 0){
		return{
			position: positionBuffer,
			indices: indexBuffer
		};
	}
	const normalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([]), gl.DYNAMIC_DRAW);
	return{
		position: positionBuffer,
		normal: normalBuffer,
		indices: indexBuffer
	};
}

function updateBuffers(gl, buffers, positions, normals, indices, mode){
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), mode);

	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), mode);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), mode);
}

function drawScene(gl, borderBuffers, borderShader, cursorBuffers, cursorShader, particleBuffers, particleShaders, particleType, deltaTime){
	//Apply Particle Physics
	for(var x = 0; x < gridSize; x++){
		for(var z = 0; z < gridSize; z++){
			for(var y = 0; y < gridSize; y++){ // y is last so the bottom particles are computed first
				if(particlePhysType(grid[x][y][z]) == 1){
					if(y != 0 && grid[x][y-1][z] == 0){
						grid[x][y-1][z] = grid[x][y][z];
						grid[x][y][z] = 0;
					}else if(y != 0 && particlePhysType(grid[x][y-1][z]) == 3){
						const rand = Math.random();
						if(rand < 0.5){
							const temp = grid[x][y-1][z];
							grid[x][y-1][z] = grid[x][y][z];
							grid[x][y][z] = temp;
						}else if(rand < 0.6){
							var driftSpots = [];
							var spotNum = 0;
							if(x != 0 && particlePhysType(grid[x-1][y-1][z]) == 3){
								spotNum++;
								driftSpots.push(0);
							}
							if(x+1 != gridSize && particlePhysType(grid[x+1][y-1][z]) == 3){
								spotNum++;
								driftSpots.push(1);
							}
							if(z != 0 && particlePhysType(grid[x][y-1][z-1]) == 3){
								spotNum++;
								driftSpots.push(2);
							}
							if(z+1 != gridSize && particlePhysType(grid[x][y-1][z+1] == 3)){
								spotNum++;
								driftSpots.push(3);
							}
							if(driftSpots != 0){
								const rand2 = Math.floor(Math.random() * spotNum);
								if(driftSpots[rand2] == 0){
									const temp = grid[x-1][y-1][z];
									grid[x-1][y-1][z] = grid[x][y][z];
									grid[x][y][z] = temp;
								}else if(driftSpots[rand2] == 0){
									const temp = grid[x+1][y-1][z];
									grid[x+1][y-1][z] = grid[x][y][z];
									grid[x][y][z] = temp;
								}else if(driftSpots[rand2] == 0){
									const temp = grid[x][y-1][z-1];
									grid[x][y-1][z-1] = grid[x][y][z];
									grid[x][y][z] = temp;
								}else{
									const temp = grid[x][y-1][z+1];
									grid[x][y-1][z+1] = grid[x][y][z];
									grid[x][y][z] = temp;
								}
							}
						}
					}
				}else if(particlePhysType(grid[x][y][z] == 3)){
					if(Math.random() < 0.05){
						inertia[x][y][z] = Math.floor(Math.random() * 4)+1
					}
					if(y != 0 && grid[x][y-1][z] == 0){
						grid[x][y-1][z] = grid[x][y][z];
						inertia[x][y-1][z] = inertia[x][y][z];
						grid[x][y][z] = 0;
						inertia[x][y][z] = 0;
					}else if(y != 0){
						var heights = [0,0,0,0];
						if(x != 0 && grid[x-1][y][z] == 0){
							for(var i = y-1; i >= 0; i--){
								if(grid[x-1][i][z] == 0){
									heights[0]++;
								}else{
									i = -1;
								}
							}
						}else{
							heights[0] = -1;
						}
						if(x+1 != gridSize && grid[x+1][y][z] == 0){
							for(var i = y-1; i >= 0; i--){
								if(grid[x+1][i][z] == 0){
									heights[1]++;
								}else{
									i = -1;
								}
							}
						}else{
							heights[1] = -1;
						}
						if(z != 0 && grid[x][y][z-1] == 0){
							for(var i = y-1; i >= 0; i--){
								if(grid[x][i][z-1] == 0){
									heights[2]++;
								}else{
									i = -1;
								}
							}
						}else{
							heights[2] = -1;
						}
						if(z+1 != gridSize && grid[x][y][z+1] == 0){
							for(var i = y-1; i >= 0; i--){
								if(grid[x][i][z+1] == 0){
									heights[3]++;
								}else{
									i = -1;
								}
							}
						}else{
							heights[3] = -1;
						}
						var moved = false;
						var zeroHeight = true;
						for(var i = 0; i < 4; i++){
							if(heights[i] > 0){
								zeroHeight = false;
							}
						}
						if(zeroHeight && heights[inertia[x][y][z] - 1] == 0){
							if(inertia[x][y][z] == 1){
								grid[x-1][y][z] = grid[x][y][z];
								inertia[x-1][y][z] = inertia[x][y][z];
								grid[x][y][z] = 0;
								inertia[x][y][z] = 0;
							}else if(inertia[x][y][z] == 2){
								grid[x+1][y][z] = grid[x][y][z];
								inertia[x+1][y][z] = inertia[x][y][z];
								grid[x][y][z] = 0;
								inertia[x][y][z] = 0;
							}else if(inertia[x][y][z] == 3){
								grid[x][y][z-1] = grid[x][y][z];
								inertia[x][y][z-1] = inertia[x][y][z];
								grid[x][y][z] = 0;
								inertia[x][y][z] = 0;
							}else{
								grid[x][y][z+1] = grid[x][y][z];
								inertia[x][y][z+1] = inertia[x][y][z];
								grid[x][y][z] = 0;
								inertia[x][y][z] = 0;
							}
							moved = true;
						}
						if(!moved){
							var max = 0;
							var maxIds = [];
							for(var i = 0; i < 4; i++){
								if(heights[i] > max){
									max = heights[i];
									maxIds = maxIds.slice(maxIds.length - 1);
									maxIds[0] = i;
								}else if(heights[i] == max && max != 0){
									maxIds.push(i);
								}
							}
							if(max != 0){
								if(maxIds.length != 1){
									var inertial = false;
									for(var i = 0; i < 4; i++){
										if(maxIds[i] == inertia[x][y][z]){
											maxIds[0] = maxIds[i];
											inertial = true;
										}
									}
									if(!inertial){
										const rand3 = Math.floor(Math.random() * maxIds.length);
										maxIds[0] = maxIds[rand3];
									}
								}
								if(maxIds[0] == 0){
									grid[x-1][y-1][z] = grid[x][y][z];
									grid[x][y][z] = 0;
									inertia[x-1][y-1][z] = 1;
									inertia[x][y][z] = 0;
								}else if(maxIds[0] == 1){
									grid[x+1][y-1][z] = grid[x][y][z];
									grid[x][y][z] = 0;
									inertia[x+1][y-1][z] = 2;
									inertia[x][y][z] = 0;
								}else if(maxIds[0] == 2){
									grid[x][y-1][z-1] = grid[x][y][z];
									grid[x][y][z] = 0;
									inertia[x][y-1][z-1] = 3;
									inertia[x][y][z] = 0;
								}else{
									grid[x][y-1][z+1] = grid[x][y][z];
									grid[x][y][z] = 0;
									inertia[x][y-1][z+1] = 4;
									inertia[x][y][z] = 0;
								}
							}
						}
					}else{
						if(inertia[x][y][z] == 1){
							if(x != 0 && grid[x-1][y][z] == 0){
								grid[x-1][y][z] = grid[x][y][z];
								grid[x][y][z] = 0;
								inertia[x-1][y][z] = inertia[x][y][z];
								inertia[x][y][z] = 0;
							}else if(x == 0){
								inertia[x][y][z] = 2;
							}
						}else if(inertia[x][y][z] == 2){
							if(x+1 != gridSize && grid[x+1][y][z] == 0){
								grid[x+1][y][z] = grid[x][y][z];
								grid[x][y][z] = 0;
								inertia[x+1][y][z] = inertia[x][y][z];
								inertia[x][y][z] = 0;
							}else if(x+1 == gridSize){
								inertia[x][y][z] = 1;
							}
						}else if(inertia[x][y][z] == 3){
							if(z != 0 && grid[x][y][z-1] == 0){
								grid[x][y][z-1] = grid[x][y][z];
								grid[x][y][z] = 0;
								inertia[x][y][z-1] = inertia[x][y][z];
								inertia[x][y][z] = 0;
							}else if(z == 0){
								inertia[x][y][z] = 4;
							}
						}else{
							if(z+1 != gridSize && grid[x][y][z+1] == 0){
								grid[x][y][z+1] = grid[x][y][z];
								grid[x][y][z] = 0;
								inertia[x][y][z+1] = inertia[x][y][z];
								inertia[x][y][z] = 0;
							}else if(z+1 == gridSize){
								inertia[x][y][z] = 3;
							}
						}
					}
				}
			}
		}
	}
	//Update Particle Meshes
	for(var i = 1; i < particleNum; i++){
		const particleMesh = getMesh(i);
		if(particleTriCount[i] != 0){
			updateBuffers(gl, particleBuffers[i-1], particleMesh.positions, particleMesh.normals, particleMesh.indices, gl.DYNAMIC_DRAW)
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
	glMatrix.mat4.translate(borderModelViewMatrix, borderModelViewMatrix, [0,0,-4]);
	const cursorModelViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.translate(cursorModelViewMatrix, cursorModelViewMatrix, [-1 + (1/gridSize) + cursorPos[0]*(2/gridSize),-1 + (1/gridSize) + cursorPos[1]*(2/gridSize),-5 + (1/gridSize) + cursorPos[2]*(2/gridSize)]);
	const particleModelViewMatrix = glMatrix.mat4.create();
	glMatrix.mat4.translate(particleModelViewMatrix, particleModelViewMatrix, [-1,-1,-2.5]);
	const normalMatrix = glMatrix.mat4.create();
	glMatrix.mat4.invert(normalMatrix, particleModelViewMatrix);
	glMatrix.mat4.transpose(normalMatrix, normalMatrix);
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
			
			gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffers[i-1].normal);
			gl.vertexAttribPointer(gl.getAttribLocation(particleShaders[i-1], 'aVertexNormal'),3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(gl.getAttribLocation(particleShaders[i-1], 'aVertexNormal'));

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, particleBuffers[i-1].indices);

			gl.useProgram(particleShaders[i-1]);
			gl.uniformMatrix4fv(gl.getUniformLocation(particleShaders[i-1], 'uProjectionMatrix'), false, projectionMatrix);
			gl.uniformMatrix4fv(gl.getUniformLocation(particleShaders[i-1], 'uModelViewMatrix'), false, particleModelViewMatrix);
			gl.uniformMatrix4fv(gl.getUniformLocation(particleShaders[i-1], 'uNormalMatrix'), false, normalMatrix);
			{
				gl.drawElements(gl.TRIANGLES, particleTriCount[i], gl.UNSIGNED_SHORT, 0);
			}
		}
	}
}
function getMesh(particle){
	var positionss = [];
	var indicess = [];
	var normalss = [];
	var gridCount = 0;
	const size = 2/gridSize;
	for(var x = 0; x < gridSize; x++){
		for(var y = 0; y < gridSize; y++){
			for(var z = 0; z < gridSize; z++){
				if(grid[x][y][z] == particle){
					if(x+1 == gridSize || grid[x + 1][y][z] != particle){
						positionss = positionss.concat([
							(size*(x+1)), (size*(y)), -2.5 + (size*(z)), //-Y -Z
							(size*(x+1)), (size*(y+1)), -2.5 + (size*(z)), //+Y -Z
							(size*(x+1)), (size*(y)), -2.5 + (size*(z+1)), //-Y +Z
							(size*(x+1)), (size*(y+1)), -2.5 + (size*(z+1)), //+Y +Z
						]);
						normalss = normalss.concat([1.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0]);
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
						normalss = normalss.concat([-1.0,0.0,0.0,-1.0,0.0,0.0,-1.0,0.0,0.0,-1.0,0.0,0.0]);
						indicess = indicess.concat([gridCount,gridCount+1,gridCount+2,gridCount+1,gridCount+2,gridCount+3]);
						gridCount += 4;
					}
					if(y+1 == gridSize || grid[x][y + 1][z] != particle){
						positionss = positionss.concat([
							(size*(x)), (size*(y+1)), -2.5 + (size*(z)), //-X -Z
							(size*(x+1)), (size*(y+1)), -2.5 + (size*(z)), //+X -Z
							(size*(x)), (size*(y+1)), -2.5 + (size*(z+1)), //-X +Z
							(size*(x+1)), (size*(y+1)), -2.5 + (size*(z+1)), //+X +Z
						]);
						normalss = normalss.concat([0.0,1.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0]);
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
						normalss = normalss.concat([0.0,-1.0,0.0,0.0,-1.0,0.0,0.0,-1.0,0.0,0.0,-1.0,0.0]);
						indicess = indicess.concat([gridCount,gridCount+1,gridCount+2,gridCount+1,gridCount+2,gridCount+3]);
						gridCount += 4;
					}
					if(z+1 == gridSize || grid[x][y][z + 1] != particle){
						positionss = positionss.concat([
							(size*(x)), (size*(y)), -2.5 + (size*(z+1)), //-Y -X
							(size*(x)), (size*(y+1)), -2.5 + (size*(z+1)), //+Y -X
							(size*(x+1)), (size*(y)), -2.5 + (size*(z+1)), //-Y +X
							(size*(x+1)), (size*(y+1)), -2.5 + (size*(z+1)), //+Y +X
						]);
						normalss = normalss.concat([0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,1.0,0.0,0.0,1.0]);
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
						normalss = normalss.concat([0.0,0.0,-1.0,0.0,0.0,-1.0,0.0,0.0,-1.0,0.0,0.0,-1.0]);
						indicess = indicess.concat([gridCount,gridCount+1,gridCount+2,gridCount+1,gridCount+2,gridCount+3]);
						gridCount += 4;
					}
				}
			}
		}
	}
	particleTriCount[particle] = (gridCount/2)*3;
	return{
		positions: positionss,
		indices: indicess,
		normals: normalss
	};
}
function moveCursor(x,y,z){
	cursorPos[0] += (cursorPos[0]+x>=0 && cursorPos[0]+x<gridSize)?x:0;
	cursorPos[1] += (cursorPos[1]+y>=0 && cursorPos[1]+y<gridSize)?y:0;
	cursorPos[2] += (cursorPos[2]+z>=0 && cursorPos[2]+z<gridSize)?z:0;
}
function placeParticle(particle){
	grid[cursorPos[0]][cursorPos[1]][cursorPos[2]] = particle;
	if(particlePhysType(particle) == 3){
		inertia[cursorPos[0]][cursorPos[1]][cursorPos[2]] = Math.floor(Math.random() * 4) + 1;
	}
}
function getColor(particle){
	if(particle == 0){
		return [0.0,0.0,0.0,1.0];
	}else if(particle == 1){
		return [0.95,0.87,0.33,1.0];
	}else if(particle == 2){
		return [0.52,0.525,0.53,1.0];
	}else if(particle == 3){
		return [0.18,0.21,0.92,1.0];
	}
}
function particlePhysType(particle){
	if(particle == 0){
		return 0;
	}else if(particle == 1){
		return 1;
	}else if(particle == 2){
		return 2;
	}else if(particle == 3){
		return 3;
	}
}
function getParticleName(particle){
	if(particle == 1){
		return "Sand";
	}else if(particle == 2){
		return "Stone";
	}else if(particle == 3){
		return "Water";
	}
	return "None";
}
function keyPress(event){
	if(event.code == "KeyW")
		moveCursor(0,1,0);
	else if(event.code == "KeyA")
		moveCursor(-1,0,0);
	else if(event.code == "KeyS")
		moveCursor(0,-1,0);
	else if(event.code == "KeyD")
		moveCursor(1,0,0);
	else if(event.code == "KeyQ")
		moveCursor(0,0,1);
	else if(event.code == "KeyE")
		moveCursor(0,0,-1);
	else if(event.code.substring(0,5) == "Digit"){
		var num = parseInt(event.code.charAt(5));
		if(num < particleNum)
			placeParticle(num);
	}

}
window.onload = main;
