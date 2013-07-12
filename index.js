/**
 * Component dependencies.
 */

var Shader = require('webgl-shader');
var Attribute = require('webgl-attribute');
var Uniform = require('webgl-uniform');

/**
 * Expose component
 */

module.exports = function (context) {

  /**
   * Program
   * Create a program.
   * @param {Object} options Options for creating the program.
   *   @param {Shader} [options.vertex] The vertex shader.
   *   @param {Shader} [options.fragment] The fragment shader. 
   * @return {Program} A program.
   * @api public
   */

  function Program (options) {
    var options = options || {};
    var vertex = options.vertex;
    var fragment = options.fragment;
    var program = context.createProgram();
    
    context.attachShader(program, vertex.shader);
    context.attachShader(program, fragment.shader);
    context.linkProgram(program);
    
    var valid = context.getProgramParameter(program, context.LINK_STATUS);
    var log = context.getProgramInfoLog(program);
    
    this.program = program;
    this.vertex = vertex;
    this.fragment = fragment;
    this.valid = valid;
    this.log = log;
    
    this.attributes = {};
    this.uniforms = {};    
    this.buffers = {};

    this.linkAttributes(context);
    this.linkUniforms(context);
  };

  /**
   * Program.create
   * Create a program.
   * @param {Object} options Options for creating the program.
   *   @param {Shader} [options.vertex] The vertex shader.
   *   @param {Shader} [options.fragment] The fragment shader. 
   * @return {Program} A program.
   * @api public
   */

  Program.create = function (options) {
    return new Program(options);
  };

  /**
   * Program#destroy
   * Destroy this Program.
   * @api public
   */

  Program.prototype.destroy = function () {
    context.deleteProgram(this.program);
    this.vertex.destroy(context);
    this.fragment.destroy(context);
  };

  /**
   * Program#linkAttributes
   * Link program attributes.
   * @return {Program} this for chaining.
   * @api private
   */

  Program.prototype.linkAttributes = function () {
    var program = this.program;
    var attributes = this.attributes;
    var n = context.getProgramParameter(program, context.ACTIVE_ATTRIBUTES);
    var i;
    var a;

    for (i = 0; i < n; ++i) {
      a = context.getActiveAttrib(program, i);
      if (a) {
        attributes[a.name] = new Attribute({
          name: a.name, 
          type: a.type, 
          size: a.size,  
          location: context.getAttribLocation(program, a.name)
        });
      }
    }

    return this;
  };

  /**
   * Link this program.
   * @return {Program} this for chaining.
   * @api public
   */

  Program.prototype.link = function () {
    context.linkProgram(this.program);
    return this;
  };

  /**
   * Link program uniforms.
   * @return {Program} this for chaining.
   * @api private
   */

  Program.prototype.linkUniforms = function () {
    var program = this.program;
    var uniforms = this.uniforms;
    var n = context.getProgramParameter(program, context.ACTIVE_UNIFORMS);
    var i;
    var u;

    for (i = 0; i < n; ++i) {
      u = context.getActiveUniform(program, i);
      if (u) {
        uniforms[u.name] = new Uniform(context, {
            name: u.name 
          , type: u.type 
          , size: u.size 
          , location: context.getUniformLocation(program, u.name)
        });
      }
    }
    
    return this;
  };

  /**
   * Bind this program.
   * @return {Program} this for chaining.
   * @api public
   */

  Program.prototype.bind = function () {
    context.useProgram(this.program);
    return this;
  };

  /**
   * Unbind this program.
   * @return {Program} this for chaining.
   * @api public
   */  

  Program.prototype.unbind = function () {
    context.useProgram(null);
    return this;
  };

  /**
   * Bind an attribute buffer in this program.
   * @param {String} name The name of the attribute.
   * @param {Object} [options] The options for the attribute to bind. 
   *   @param {Number} [options.attributeType = context.ARRAY_BUFFER] The WebGL attribute type. 
   *   @param {Number} [options.dataType = context.FLOAT] The WebGL type of an element in the attribute buffer.
   *   @param {Number} [options.drawType = context.STATIC_DRAW] The WebGL drawing mode. 
   *   @param {Number} [options.size = 1] The size of the attribute elements in bytes. 
   *   @param {Number} [options.stride = 0] The stride of the attribute buffer. 
   *   @param {Number} [options.offset = 0] The offset of the attribute buffer. 
   *   @param {Object} [options.data] The attribute buffer data. 
   * @returns {Program} this for chaining.
   * @api public.
   */

  Program.prototype.bindAttribute = function(name, options) { 
    var options = options || {};
    var attributeType = options.attributeType;
    var dataType = options.dataType || context.FLOAT;
    var drawType = options.drawType || context.STATIC_DRAW;
    var size = options.size || 1;
    var stride = options.stride || 0;
    var offset = options.offset || 0;
    var data = options.data;
    var hasData = data !== undefined;
    var hasBuffer = name in this.buffers;
    var buffer = hasBuffer ? this.buffers[name] : context.createBuffer();
    var attribute = this.attributes[name];
    var index =  attribute && attribute.getIndex();
    var isAttribute = index !== undefined;
    
    if (!hasBuffer) {
      this.buffers[name] = buffer;
      if (isAttribute) {
        context.enableVertexAttribArray(index);
      }
    }
    context.bindBuffer(attributeType, buffer);
    if (hasData) {
      context.bufferData(attributeType, data, drawType);
    }
    if (isAttribute) {
      context.vertexAttribPointer(index, size, dataType, false, stride, offset);
    }

    delete options.data;
    
    return this;
  };

  /**
   * Bind all the attributes in this program.
   * @param {WebGLRenderingContext} context A WebGL rendering context.
   * @param {Object} attributes The attributes to bind.
   * @return {Program} this for chaining.
   */

  Program.prototype.bindAttributes = function (attributes) {
    Object.keys(attributes).forEach(function (name) {
      this.bindAttribute(context, name, attributes[name]);
    });
    return this;
  };

  /**
   * Bind an uniform variable in this program.
   * @param {String} name The name of the uniform.
   * @param {Object} value The value for the uniform to bind.
   * @return {Program} this for chaining.
   */

  Program.prototype.bindUniform = function (name, value) {
    var uniform = this.uniforms[name];
    if (uniform) {
      uniform.setValue(value);
    }
    return this;
  }; 

  /**
   * Bind all the uniform variables in this program.
   * @param {WebGLRenderingContext} context A WebGL rendering context.
   * @param {Object} uniforms The uniform variables to bind.
   * @return {Program} this for chaining.
   */

  Program.prototype.bindUniforms = function (uniforms) {
    Object.keys(uniforms).forEach(function (name) {
      this.bindUniform(name, uniforms[name]);
    });
    return this;
  };

  return Program;
};
