/*
 * Copyright 2011 Rolando Abarca.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Externs for glMatrix 1.0.0
 *
 * @see http://code.google.com/p/glmatrix/
 * @externs
 */

/** @typedef {Object.<number,number>} */
var vec2;

/**
 * @constructor
 * @param {vec2=} vec
 * @return {vec2}
 */
vec2.create = function (vec) {};

/** @typedef {Object.<number,number>} */
var vec3;

/**
 * @constructor
 * @param {vec3=} vec
 * @return {vec3}
 */
vec3.create = function(vec) {};

/**
 * @param {vec3} vec
 * @param {vec3=} dest
 * @return {vec3}
 */
vec3.set = function(vec, dest) {};

/**
 * @param {vec3} vec
 * @param {vec3} vec2
 * @param {vec3=} dest
 * @return {vec3}
 */
vec3.add = function(vec, vec2, dest) {};

/**
 * @param {vec3} vec
 * @param {vec3} vec2
 * @param {vec3=} dest
 * @return {vec3}
 */
vec3.subtract = function(vec, vec2, dest) {};

/**
 * @param {vec3} vec
 * @param {vec3=} dest
 * @return {vec3}
 */
vec3.negate = function(vec, dest) {};

/**
 * @param {vec3} vec
 * @param {number} val
 * @param {vec3=} dest
 * @return {vec3}
 */
vec3.scale = function(vec, val, dest) {};

/**
 * @param {vec3} vec
 * @param {vec3=} dest
 * @return {vec3}
 */
vec3.normalize = function(vec, dest) {};

/**
 * @param {vec3} vec
 * @param {vec3} vec2
 * @param {vec3=} dest
 * @return {vec3}
 */
vec3.cross = function(vec, vec2, dest) {};

/**
 * @param {vec3} vec
 * @return {number}
 */
vec3.length = function(vec) {};

/**
 * @param {vec3} vec
 * @param {vec3} vec2
 * @return {number}
 */
vec3.dot = function(vec, vec2) {};

/**
 * @param {vec3} vec
 * @param {vec3} vec2
 * @param {vec3=} dest
 * @return {vec3}
 */
vec3.direction = function(vec, vec2, dest) {};

/**
 * @param {vec3} vec
 * @param {vec3} vec2
 * @param {number} lerp
 * @param {vec3=} dest
 * @return {vec3}
 */
vec3.lerp = function(vec, vec2, lerp, dest) {};

/**
 * @param {vec3} vec
 * @return {string}
 */
vec3.str = function(vec) {};

/** @typedef {Object.<number,number>} */
var mat4 = {};

/**
 * @constructor
 * @param {mat4=} mat
 * @return {mat4}
 */
mat4.create = function(mat) {};

/**
 * @param {mat4} mat
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.set = function(mat, dest) {};

/**
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.identity = function(dest) {};

/**
 * @param {mat4} mat
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.transpose = function(mat, dest) {};

/**
 * @param {mat4} mat
 * @return {number}
 */
mat4.determinant = function(mat) {};

/**
 * @param {mat4} mat
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.inverse = function(mat, dest) {};

/**
 * @param {mat4} mat
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.toRotationMat = function(mat, dest) {};

/**
 * @param {mat4} mat
 * @param {mat4} mat2
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.multiply = function(mat, mat2, dest) {};

/**
 * @param {mat4} mat
 * @param {vec3} vec
 * @param {vec3=} dest
 * @return {vec3}
 */
mat4.multiplyVec3 = function(mat, vec, dest) {};

/**
 * @param {mat4} mat
 * @param {vec3} vec
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.translate = function(mat, vec, dest) {};

/**
 * @param {mat4} mat
 * @param {vec3} vec
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.scale = function(mat, vec, dest) {};

/**
 * @param {mat4} mat
 * @param {number} angle
 * @param {vec3} axis
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.rotate = function(mat, angle, axis, dest) {};

/**
 * @param {number} left
 * @param {number} right
 * @param {number} bottom
 * @param {number} top
 * @param {number} near
 * @param {number} far
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.frustum = function(left, right, bottom, top, near, far, dest) {};

/**
 * @param {number} fovy
 * @param {number} aspect
 * @param {number} near
 * @param {number} far
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.perspective = function(fovy, aspect, near, far, dest) {};

/**
 * @param {number} left
 * @param {number} right
 * @param {number} bottom
 * @param {number} top
 * @param {number} near
 * @param {number} far
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.ortho = function(left, right, bottom, top, near, far, dest) {};

/**
 * @param {vec3} eye
 * @param {vec3} center
 * @param {vec3} up
 * @param {mat4=} dest
 * @return {mat4}
 */
mat4.lookAt = function(eye, center, up, dest) {};

/** @typedef {Object.<number,number>} */
var quat4 = {};

/**
 * @param {quat4=} quat
 * @return {quat4}
 */
quat4.create = function(quat) {};

/**
 * @param {quat4} quat
 * @param {quat4=} dest
 * @return {quat4}
 */
quat4.set = function(quat, dest) {};

/**
 * @param {quat4} quat
 * @param {quat4=} dest
 * @return {quat4}
 */
quat4.calculateW = function(quat, dest) {};

/**
 * @param {quat4} quat
 * @param {quat4=} dest
 * @return {quat4}
 */
quat4.inverse = function(quat, dest) {};

/**
 * @param {quat4} quat
 * @return {number}
 */
quat4.length = function(quat, dest) {};

/**
 * @param {quat4} quat
 * @param {quat4=} dest
 * @return {quat4}
 */
quat4.normalize = function(quat, dest) {};

/**
 * @param {quat4} quat
 * @param {quat4} quat2
 * @param {quat4=} dest
 * @return {quat4}
 */
quat4.multiply = function(quat, quat2, dest) {};

/**
 * @param {quat4} quat
 * @param {vec3} vec
 * @param {vec3=} dest
 * @return {vec3}
 */
quat4.multiplyVec3 = function(quat, vec, dest) {};

/**
 * @param {quat4} quat
 * @param {quat4} quat2
 * @param {number} slerp
 * @param {quat4=} dest
 * @return {quat4}
 */
quat4.slerp = function(quat, quat2, slerp, dest) {};

/**
 * @param {quat4} quat
 * @return {string}
 */
quat4.str = function(quat) {};
