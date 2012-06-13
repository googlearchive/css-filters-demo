/**
 * @fileoverview Allows us to write out art elements.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Serializer');
goog.provide('gfd.Serializable');

/**
 * A serializable object.
 * @interface
 */
gfd.Serializable = function(){};

/**
 * Serialize and return a simple object.
 * @returns {Object}
 */
gfd.Serializable.prototype.serialize = function() {};

/**
 * Deserialize a simple object and return the result.
 * @param {Object} obj
 * @returns {gfd.Serializable}
 */
gfd.Serializable.prototype.deserialize = function(obj) {};

/**
 * Returns the unique serialization id for the class.
 * @returns {string}
 */
gfd.Serializable.prototype.getSerializationId = function() {};

/**
 * Static array of classes stored by unique class id.
 * @type {Object.<string, function(new: gfd.Serializable)>}
 * @private
 */
gfd.Serializer.classes_ = {};

/**
 * Registers a class a serializable.
 * @param {string} id
 * @param {function(new: gfd.Serializable)} cls
 */
gfd.Serializer.registerClassForId = function(id, cls)
{
  gfd.Serializer.classes_[id] = cls;
};

/**
 * Serializes the given object into an object that can then be serialized with
 * json.serialize
 * @param {gfd.Serializable} serializable
 */
gfd.Serializer.serialize = function(serializable)
{
  return {id:serializable.getSerializationId(),
           data:serializable.serialize() };
};

/**
 * Serializes a json object (not string)
 * @param {Object}
 * @returns {gfd.Serializable}
 */
gfd.Serializer.deserialize = function(json)
{
  var obj;
  if (json && json.id)
  {
    try {
      obj = new gfd.Serializer.classes_[json.id]();
      obj.deserialize(json.data);
    } catch(e) {
      return null;
    }
  }
  
  return obj;
};