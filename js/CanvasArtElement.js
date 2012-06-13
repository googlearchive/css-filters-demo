/**
 * @fileoverview Base class and all subclasses for CanvasArtElements. These
 * are elements that use an HTML Canvas as their rendering element.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */
goog.provide('gfd.CanvasArtElement');
goog.provide('gfd.CanvasRainbowSurferElement');

goog.require('gfd.ArtElement');
goog.require('gfd.Constants');
goog.require('gfd.Palette');
goog.require('gfd.Point');
goog.require('gfd.RandomPalette');
goog.require('gfd.Rectangle');
goog.require('gfd.Serializer');


/**
 * An ArtElement that encapsulates an HTML Canvas.
 * @param {number=} opt_allFlags
 * @constructor
 * @extends {gfd.ArtElement}
 */
gfd.CanvasArtElement = function(opt_allFlags)
{
  gfd.ArtElement.call(this, 'canvas', 
      gfd.CanvasArtElement.UpdateFlags | opt_allFlags);
  
  this.canvas_ = null;
  this.context_ = null;
  this.dataInvalid_ = true;
};
goog.inherits(gfd.CanvasArtElement, gfd.ArtElement);


/**
 * @type {Array.<HTMLCanvasElement>}
 * @private
 */
gfd.CanvasArtElement.pool_ = [];

/**
 * @type {Array.<HTMLCanvasElement>}
 * @private
 */
gfd.CanvasArtElement.inUse_ = [];

/**
 * A factory method for creating CanvasArtElements so as to not overload
 * resources.
 * @param {gfd.ArtElement.FactoryDelegate} factoryDelegate
 * @param {function(new: gfd.CanvasArtElement)} canvasClass
 * @returns
 */
gfd.CanvasArtElement.create = function(factoryDelegate, canvasClass)
{
  // See if we have proper resources for creating the object
  
  var bytes = 0;
  
  if (gfd.CanvasArtElement.inUse_.length)
  {
    do
    {
      bytes = 0;
      
      for (var i = 0; i < gfd.CanvasArtElement.inUse_.length; i++)
      {
        bytes += gfd.CanvasArtElement.inUse_[i].width * 
          gfd.CanvasArtElement.inUse_[i].height * 4;
      }

      // Allow for 12 megs of images
      if (bytes > gfd.Constants.MAX_CANVAS_BYTES)
      {
        if (!factoryDelegate.removeLruOfClass(gfd.CanvasArtElement))
        {
          break;
        }
      }
    }
    while (bytes > gfd.Constants.MAX_CANVAS_BYTES);
  }
    
  if (bytes < gfd.Constants.MAX_CANVAS_BYTES)
  {
    return new canvasClass();
  }
};

/**
 * @param {gfd.Rectangle=} opt_rect
 * @override
 */
gfd.CanvasArtElement.prototype.init = function(opt_rect)
{
  if (gfd.ArtElement.prototype.init.call(this, 
      this.canvas_ = gfd.CanvasArtElement.pool_.length ? 
          gfd.CanvasArtElement.pool_.pop() : 
            document.createElement('canvas')))
  {
    gfd.CanvasArtElement.inUse_.push(this.canvas_);
    
    if (opt_rect) this.setRect(opt_rect);
    return this;
  }
};


/**
 * @inheritDoc
 */
gfd.CanvasArtElement.prototype.serialize = function()
{
  var obj = gfd.ArtElement.prototype.serialize.call(this);
  return obj;
};

/**
 * @inheritDoc
 */
gfd.CanvasArtElement.prototype.deserialize = function(data)
{
  if (gfd.ArtElement.prototype.deserialize.call(this, data))
  {
    return this.init();
  }
};

gfd.CanvasArtElement.prototype.updateRectImpl = function(oldRect, newRect)
{
  this.canvas_.width = newRect.width;
  this.canvas_.height = newRect.height;
};


gfd.CanvasArtElement.prototype.updateTransformImpl = function(transform)
{
  //transform[4] = -transform[4];
  //transform[5] = -transform[5];
  this.transformDataPoints(transform);
  this.dataInvalid_ = true;
  return false; // Don't transform rectangle
};

gfd.CanvasArtElement.prototype.disposeInternal = function()
{
  this.canvas_.width = 0;
  this.canvas_.height = 0;
  gfd.CanvasArtElement.pool_.push(this.canvas_);
  gfd.CanvasArtElement.inUse_.splice(gfd.CanvasArtElement.inUse_.indexOf(this.canvas_), 1);
  
  this.canvas_ = null;
  this.context_ = null;
  
  gfd.ArtElement.prototype.disposeInternal.call(this);
};

gfd.CanvasArtElement.prototype.load = function()
{
  this.context_ = this.canvas_.getContext('2d');
};

/**
 * @param {number} x
 * @param {number} y
 * @param {gfd.Selection=} opt_selection
 * @returns {boolean}
 * @override
 */
gfd.CanvasArtElement.prototype.hit = function(x, y, opt_selection)
{
  
  if (this.context_)
  {
    var r = this.getRect();
    var imgData = this.context_.getImageData(x - r.x, y - r.y, 1, 1);
    if (imgData && imgData.data) return imgData.data[3] > 0;
  }

  // Fallback to basic hit test
  return gfd.ArtElement.prototype.hit.call(this, x, y, opt_selection);
};

gfd.CanvasArtElement.prototype.updateDataImpl = function()
{
  
};

gfd.CanvasArtElement.prototype.updateImpl = function(elapsedTimeInSeconds, flags)
{
  if (this.dataInvalid_)
  {
    this.updateDataImpl();
    this.dataInvalid_ = false;
  }
  
  if (!this.draw(this.context_, elapsedTimeInSeconds))
  {
    flags &= gfd.ArtElement.UpdateFlags.CLEAR_RENDER;
  }
  
  return flags;
};



/**
 * An ArtElement that encapsulates a Canvas
 * @constructor
 * @extends {gfd.CanvasArtElement}
 * @implements {gfd.Serializable}
 */
gfd.CanvasRainbowSurferElement = function()
{
  gfd.CanvasArtElement.call(this);
  
  /**
   * @type {number}
   * @private
   */
  this.numStrokes_ = 10;
  
  /**
   * @type {number}
   * @private
   */
  this.strokeWidth_ = 10;
  
  /**
   * @type {number}
   * @private
   */
  this.strokeDrawWidth_ = 1;
  
  /**
   * @type {Array.<gfd.Point>}
   * @private
   */
  this.points_ = null;
  
  /**
   * @type {Array.<Object>}
   * @private
   */
  this.strokes_ = [];
  
  /**
   * @type {gfd.RandomPalette}
   * @private
   */
  this.palette_ = null;
  
  /**
   * @type {string}
   * @private
   */
  this.paletteName_ = null;
};
goog.inherits(gfd.CanvasRainbowSurferElement, gfd.CanvasArtElement);

/**
 * @const
 * @type {string}
 * @private
 */
gfd.CanvasRainbowSurferElement.serialId = 'cvsrs';

//Register for serialization engine
gfd.Serializer.registerClassForId(gfd.CanvasRainbowSurferElement.serialId, 
    gfd.CanvasRainbowSurferElement);


/** @override */
gfd.CanvasRainbowSurferElement.prototype.disposeInternal = function()
{
  this.palette_.dispose();
  this.palette_ = null;
  
  this.points_ = null;
  this.strokes_ = null;
  
  gfd.CanvasArtElement.prototype.disposeInternal.call(this);
};

/**
 * @override
 */
gfd.CanvasRainbowSurferElement.prototype.setPaletteName = function(p)
{
  if (p !== this.paletteName_)
  {
    this.paletteName_ = p;
    this.requestRender();
  }
};



/**
 * @param {gfd.Rectangle=} opt_rect
 * @param {Array.<gfd.Point>=} points
 * @override
 */
gfd.CanvasRainbowSurferElement.prototype.initWithData = function(opt_rect, 
    points, opt_numStrokes, opt_strokeDist, opt_strokeWidth, opt_paletteSeed)
{
  if (gfd.CanvasArtElement.prototype.init.call(this, opt_rect))
  {
    
    if (goog.isDef(opt_numStrokes)) this.numStrokes_ = opt_numStrokes;
    if (goog.isDef(opt_strokeDist)) this.strokeWidth_ = opt_strokeDist;
    if (goog.isDef(opt_strokeWidth)) this.strokeDrawWidth_ = opt_strokeWidth;
    
    this.palette_ = new gfd.RandomPalette(opt_paletteSeed);
    this.points_ = points;
    this.dataInvalid_ = true;

    return this;
  }
};



/**
 * @inheritDoc
 */
gfd.CanvasRainbowSurferElement.prototype.serialize = function()
{
  var obj = gfd.CanvasArtElement.prototype.serialize.call(this);
  
  if (this.points_)
  {
    obj['nstr'] = this.numStrokes_;
    obj['strw'] = this.strokeWidth_;
    obj['strdw'] = this.strokeDrawWidth_;
    obj['palsd'] = this.palette_.getSeed();
    obj['pts'] = gfd.Point.flattenArray(this.points_);
  }
  
  return obj;
};

/**
 * @inheritDoc
 */
gfd.CanvasRainbowSurferElement.prototype.deserialize = function(data)
{
  if (gfd.CanvasArtElement.prototype.deserialize.call(this, data))
  {
    return this.initWithData( null, 
                              gfd.Point.unflattenArray(data['pts']),
                              data['nstr'],
                              data['strw'],
                              data['strdw'],
                              data['palsd']);
  }
};

/**
 * @inheritDoc
 */
gfd.CanvasRainbowSurferElement.prototype.getSerializationId = function()
{
  return gfd.CanvasRainbowSurferElement.serialId;
};


/** @override */
gfd.CanvasRainbowSurferElement.prototype.collectDataPoints = function(pts)
{
  pts.push(this.points_);
};

/** @override */
gfd.CanvasRainbowSurferElement.prototype.updateDataImpl = function()
{
  var i, j, points = this.points_;
  

  //console.log('points = ['); 
  for (i = 0; i < points.length; i++)
  {
   //console.log('new gfd.Point(' + points[i].x + ',' + points[i].y+'),');
  }
  //console.log('];');
  /*
  points = [ 
             new gfd.Point(101,169), 
             new gfd.Point(101,167), 
             new gfd.Point(107,163), 
             new gfd.Point(121,160), 
             new gfd.Point(169,160), 
             new gfd.Point(200,170), 
             new gfd.Point(235,195), 
             new gfd.Point(301,256), 
             new gfd.Point(331,282), 
             new gfd.Point(359,303), 
             new gfd.Point(394,328), 
             new gfd.Point(432,347), 
             new gfd.Point(478,362), 
             new gfd.Point(526,368), 
             new gfd.Point(578,368), 
             new gfd.Point(614,348), 
             new gfd.Point(629,325), 
             new gfd.Point(643,288), 
             new gfd.Point(647,253), 
             new gfd.Point(646,229), 
             new gfd.Point(634,213), 
             new gfd.Point(623,206), 
             new gfd.Point(598,197), 
             new gfd.Point(576,194), 
             new gfd.Point(509,194), 
             new gfd.Point(460,220), 
             new gfd.Point(411,263), 
             new gfd.Point(359,316), 
             new gfd.Point(323,357), 
             new gfd.Point(286,402), 
             new gfd.Point(257,441), 
             new gfd.Point(235,487), 
             new gfd.Point(227,506), 
             new gfd.Point(219,518), 
             new gfd.Point(217,521)
             ]; 
  */
  // Grab all inflection tangents
  var cp = gfd.Point.getInflectionPoints(points);
  var tangents = [points[0], points[1]];
  var cp1 = [1];
  var tl = 2;
  var cpl = 1;
  for (i = 0; i < cp.length; i++)
  {
    // Make sure start point is at least 10 pixels from last tangent point
    // Also make sure two tangent points are not coincident with last tangent
    if (Math.sqrt((points[cp[i]].x - tangents[tl-1].x) * (points[cp[i]].x -
        tangents[tl-1].x) + (points[cp[i]].y - tangents[tl-1].y) * 
        (points[cp[i]].y - tangents[tl-1].y)) > 15)
    {
      // Check if near last line
      //if (Math.abs(points[cp[i]].isLeft(tangents[tl-2], tangents[tl-1])) > 15 &&
       //   Math.abs(points[cp[i]+1].isLeft(tangents[tl-2], tangents[tl-1])) > 15)
      {
        // Check if angle is different enough
        if (gfd.Geometry.absAngleDif(Math.atan2(points[cp[i]+2].y - points[cp[i]-2].y,
            points[cp[i]+2].x - points[cp[i]-2].x), 
            Math.atan2(tangents[tl-1].y - tangents[tl-2].y, tangents[tl-1].x - 
                tangents[tl-2].x)) > 1)
        {
          tangents[tl++] = (points[cp[i]]);
          tangents[tl++] = (points[cp[i]+1]);
          cp1[cpl++] = cp[i]+1;
        }
      }
    }
  }
  
  // Push last points
  var pushedLast = false;
  if (cpl === 1 || Math.sqrt((points[points.length-2].x - tangents[tl-1].x) * (points[points.length-2].x -
      tangents[tl-1].x) + (points[points.length-2].y - tangents[tl-1].y) * 
      (points[points.length-2].y - tangents[tl-1].y)) > 15)
  {
    // Check if near last line
    if (cpl === 1 || gfd.Geometry.absAngleDif(Math.atan2(points[points.length-1].y - points[points.length-2].y,
        points[points.length-1].x - points[points.length-2].x), 
        Math.atan2(tangents[tl-1].y - tangents[tl-2].y, tangents[tl-1].x - 
            tangents[tl-2].x)) > 1)
    {
      tangents[tl++] = (points[points.length-2]);
      tangents[tl++] = (points[points.length-1]);
      cp1[cpl++] = points.length - 2;
      pushedLast = true;
    }
  }
  
  if (!pushedLast)
  {
    tangents[tl-2] = (points[points.length-2]);
    tangents[tl-1] = (points[points.length-1]);
    cp1[cpl - 1] = points.length - 2;
  }
  
  /*
  for (var i = 0; i < tangents.length; i+= 2)
  {
    this.strokes_.push({t:'m',x:tangents[i].x, y:tangents[i].y});
    this.strokes_.push({t:'l',x:tangents[i+1].x, y:tangents[i+1].y});
    console.log(tangents[i].x);
  }
  
  return;
  */
  
  cp = cp1;
  var x, y, r, dx, dy, dist, lp, np, temp, n = cp.length;
  var numStrokes = this.numStrokes_;
  var strokes = [];
  var strokeWidth = this.strokeWidth_;
  
  lp = points[cp[0]];
  np = new gfd.Point(points[cp[0]+1].x, points[cp[0]+1].y);
  dx = np.x - lp.x;
  dy = np.y - lp.y;
  dist = Math.sqrt(dx * dx + dy * dy);

  for (i = 1; i < n; ++i)
  {
    //console.log(cp[i]);
    // Current tangent is line from np to lp, the perpendicular to that line
    // will point towards the center of the circle we're going around.
    var perpDx1 = np.x - lp.x;
    var perpDy1 = np.y - lp.y;
    temp = Math.sqrt(perpDx1 * perpDx1 + perpDy1 * perpDy1);
    perpDx1 /= temp;
    perpDy1 /= temp;
    
    // Grab the normalized perpendicular vector between the current two points
    // This vector also points towards the center of the circle because of 
    // the perpendicular bisector rule.
    var perpDx2 = points[cp[i]].x - np.x;
    var perpDy2 = points[cp[i]].y - np.y;
    temp = Math.sqrt(perpDx2 * perpDx2 + perpDy2 * perpDy2);
    perpDx2 /= temp;
    perpDy2 /= temp;
    
    
    // Now we can begin drawing
    if (i === 1)
    {
      // Left side
      for (j = -numStrokes; j <= numStrokes; j++)
      {
        x = np.x - j * strokeWidth * perpDy1;
        y = np.y + j * strokeWidth * perpDx1;
        strokes[j + numStrokes] = [{t:'m', x:x, y:y}];
      } 
    }
    
    // If these two slopes are similar we should just draw a straight line
    if (gfd.Geometry.absAngleDif(Math.atan2(perpDy2, perpDx2), Math.atan2(perpDy1, perpDx1)) < 0.2)
    {
      // Its a straight line, snap the point onto the current tangent and
      // draw the line
      for (j = -numStrokes; j <= numStrokes; j++)
      {   
        x = points[cp[i]].x - j * strokeWidth * perpDy1;
        y = points[cp[i]].y + j * strokeWidth * perpDx1;
        strokes[j + numStrokes].push({t:'l', x:x, y:y});
        //console.log('line');
      }
      
      lp = points[cp[i]];
      np.x = lp.x + perpDx1;
      np.y = lp.y + perpDy1;
      continue;
    }
    
    // Get point that bisects the current two points for the perpendicular
    // bisector
    var biX = (points[cp[i]].x + np.x) / 2;
    var biY = (points[cp[i]].y + np.y) / 2;
    
    // So then the intersection of those two perpendicular lines is the center
    var intersectX, intersectY;
    // Check for vertical lines
    if (Math.abs(perpDy1) < 0.000001)
    {
      intersectX = np.x;
      intersectY = -perpDx2/perpDy2 * intersectX + biY + perpDx2/perpDy2 * biX;
    }
    else if (Math.abs(perpDy2) < 0.000001)
    {
      intersectX = biX;
      intersectY = -perpDx1/perpDy1 * intersectX + np.y + perpDx1/perpDy1 * np.x;
    }
    else
    {
      var m = -perpDx1/perpDy1;
      var b = np.y - m * np.x;
      
      var m1 = -perpDx2/perpDy2;
      var b1 = biY - m1 * biX;
      
      if (Math.abs(m - m1) < 0.000001)
      {
        //console.log('lines are perpendicular!');
        continue;
      }

      intersectX = (b1 - b) / (m - m1);
      intersectY = m * intersectX + b;
    }
    
    var idx = np.x - intersectX;
    var idy = np.y - intersectY;
    var radius = Math.sqrt(idx * idx + idy * idy);

    // For SVG two parameters cue how the arc is drawn. Arc sweep is the 
    // angle direction. Arc large defines if the arc will be drawn on the 
    // long side or the short side of the circle
    var arcSweep = 0;
    
    // See if its a positive or negative rotation, in SVG negative is
    // rotating to the left
    var l = points[cp[i]].isLeft(lp, np);
    
    if (l == 0)
    {
      //console.log('same as tangent line!');
      // TODO: draw a straight line to here
      continue;
    }

    arcSweep = l < 0 ? 0 : 1;
    var arcStart = Math.atan2(np.y - intersectY, np.x - intersectX);
    var arcEnd = Math.atan2(points[cp[i]].y - intersectY, points[cp[i]].x - intersectX);
    
    
    var destPoint = points[cp[i]];

    if (false && radius > 250 && gfd.Geometry.angleDif(arcStart, arcEnd, arcSweep) > Math.PI)
    {
      // Make the radius half the distance of the next point to the tangent line
      var m = dy / dx;
      var b = np.y - m * np.x;
      // Distance from current tangent to next point
      var d = Math.abs(points[cp[i]].y - m * points[cp[i]].x - b) / Math.sqrt(m * m + 1);
      // Cap radius
      radius = d / 2;

      if (l >= 0) d *= -1;
      destPoint = new gfd.Point(np.x + (perpDy1) * d, np.y - (perpDx1)*d);
       intersectX = np.x + perpDy1 * d/2;
       intersectY = np.y - perpDy1 * d/2;
       arcEnd = Math.atan2(destPoint.y - intersectY, destPoint.x - intersectX);
       /*
      for (j = -numStrokes; j < numStrokes; j++)
      {
        r = radius + j * strokeWidth * (arcSweep === 1 ? -1 : 1);
        x = np.x + perpDy1 * d + j * strokeWidth * perpDy1;
        y = np.y - perpDx1 * d - j * strokeWidth * perpDx1;
        //strokes[j + numStrokes] += ' A ' + r + ' ' + r + ' ' + ' 0 0 ' + arcSweep + ' ' +
          //x + ' ' + y;
        
        strokes.push({t:'a', cx:intersectX, cy:intersectY, r:r, 
          s:arcSweep, x:x, y:y, start:arcStart, end:arcStart + (arcEnd - arcStart)/Math.abs(arcEnd-arcStart) * Math.PI});
      }

      if (i < n - 1) i--; // visit this point again*/
      dx = -dx;
      dy = -dy;
    }
    else
    {
      // Figure out the new tangent perpendicular to the center
      dx = (points[cp[i]].y - intersectY) * (arcSweep === 1 ? -1 : 1);
      dy = (points[cp[i]].x - intersectX) * (arcSweep === 1 ? 1 : -1);
      dist = Math.sqrt(dx * dx + dy * dy);
      dx /= dist;
      dy /= dist;
    }
    
    if (true)
    {
      for (j = -numStrokes; j <= numStrokes; j++)
      {          
        var dir = j < 0 ? 0 : 1;
        var strokeIdx = j + numStrokes;
        var sweep = arcSweep;
        //var large = arcLarge;
        var start = arcStart;
        var end = arcEnd;
        //Move from the main tangent point along the perpendicular axis
        var offsetX = j * strokeWidth * perpDy1;
        var offsetY = j * strokeWidth * perpDx1;

        // If we are on the inside of the rotation (arcSweep === 1) and the 
        // offset of this shadow point is bigger than the radius of the main
        // circle, then we should draw our circle since it will be negative
        // so instead just move to the ending point of what the circle would
        // have been
        if (j !== 0 && Math.sqrt(offsetX * offsetX + offsetY * offsetY) > radius && 
            (arcSweep === dir))
        {
          // In this case just do a move to the new point, ideally it would be 
          // better to find the last intersection and redo the arc to that 
          // point lets see if that's possible on next iteration
          strokes[j + numStrokes].push({t:'m', 
            x:destPoint.x - j * strokeWidth * dy, 
            y:destPoint.y + j * strokeWidth * dx});
          //console.log('moveto');
        }
        else
        {
          offsetX = np.x - offsetX - intersectX;
          offsetY = np.y + offsetY - intersectY;
          r = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
          x = destPoint.x - j * strokeWidth * dy;
          y = destPoint.y + j * strokeWidth * dx;

          // If the last move was a moveto meaning that it had a bad radius
          // problem, then see if we can find the intersection of the previous
          // arc and the new arc.
          var lastIdx = strokes[strokeIdx].length - 2;
          if (j !== 0 && lastIdx > 0 && strokes[strokeIdx][lastIdx + 1].t === 'm')
          {
            for (;lastIdx > 0; --lastIdx)
            {
              var last1 = strokes[strokeIdx][lastIdx]; 
              if (last1.t !== 'a') break;
              // Distance between two circles
              temp = Math.sqrt( (last1.cx - intersectX) * 
                                (last1.cx - intersectX) +
                                (last1.cy - intersectY) * 
                                (last1.cy - intersectY));
              
              // Check if the circles intersect
              if (temp <= (last1.r + r) && temp >= Math.abs(last1.r - r))
              {
                // Find intersection point, the intersection point could be at
                // a position that is not visible on the arcs, in which case
                // we should ignore the intersection
                var a = (r * r - last1.r * last1.r + temp * temp) / (2 * temp);
                var p2x = intersectX + a * (last1.cx - intersectX) / temp;
                var p2y = intersectY + a * (last1.cy - intersectY) / temp;
                var h = Math.sqrt(Math.abs(r * r - a * a));
                if ((sweep !== last1.s && dir) || (sweep === last1.s && !dir)) h = -h;
                var cix = p2x + h * (last1.cy - intersectY) / temp;
                var ciy = p2y - h * (last1.cx - intersectX) / temp;
                var angle1 = Math.atan2(ciy - intersectY, cix - intersectX);
                var angle2 = Math.atan2(ciy - last1.cy, cix - last1.cx);

                if (gfd.Geometry.angleBetween(angle1, start, end, !arcSweep) &&
                   gfd.Geometry.angleBetween(angle2, last1.start, last1.end, !last1.s))
                {
                  // Modify the last arc so it stops at the intersection point
                  // and remove the moveto
                  last1.x = cix;
                  last1.y = ciy;
                  // We may have to update the large sweep flag in case we cut off 
                  // too much of the circle]
                  start = angle1;
                  // There's also a chance we cut off the previous arc
                  last1.end = angle2;
                  // Trim the array
                  strokes[strokeIdx].length = lastIdx + 1;
                  break;
                }
              }
            }
          }

          strokes[strokeIdx].push({t:'a', cx:intersectX, cy:intersectY, r:r, 
            s:sweep, x:x, y:y, start:start, end:end});
          
          /*
          if (!destPoint.equals(points[cp[i]]))
          {
            x = points[cp[i]].x - j * strokeWidth * dy;
            y = points[cp[i]].y + j * strokeWidth * dx;
            strokes[strokeIdx].push({t:'l', x:x, y:y});
          }
          */
        }
      }
      
      

      lp = destPoint;
    }

    np.x = lp.x + dx;
    np.y = lp.y + dy;
  }
  
  this.strokes_ = strokes;
};




/** @override */
gfd.CanvasRainbowSurferElement.prototype.select = function(selection)
{
  this.selection_ = selection;
  this.requestRender();
};

/** @override */
gfd.CanvasRainbowSurferElement.prototype.deselect = function(selection)
{
  this.selection_ = null;
  this.requestRender();
};

/** @override */
gfd.CanvasRainbowSurferElement.prototype.draw = function(ctx, elapsedTimeInSeconds)
{
  var palette = gfd.Palette.getPaletteByName(this.paletteName_);

  ctx.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
  
  ctx.strokeStyle = gfd.Color.WHITE.toCssColorString();
  ctx.lineWidth = this.strokeDrawWidth_;//this.strokeWidth_ + 2;

  if (this.strokes_ && this.strokes_.length >= this.numStrokes_ * 2 + 1)
  {
    for (var i = -this.numStrokes_; i <= this.numStrokes_; i++)
    {
      var stroke = this.strokes_[i + this.numStrokes_];
      var l = stroke.length;
  
      ctx.beginPath();
      //console.log('begin');
      if (!this.selection_)
      {
        ctx.strokeStyle = this.palette_.getColorString(palette, i + this.numStrokes_);
      }
      
      for (var j = 0; j < l; j++)
      {
        var data = stroke[j];
        switch (data.t)
        {
          case 'm': ctx.moveTo(data.x, data.y); //console.log('m(' + data.x + ',' + data.y + ')');break;
          case 'l': ctx.lineTo(data.x, data.y); //console.log('l(' + data.x + ',' + data.y + ')');break;
          case 'a': ctx.arc(data.cx, data.cy, data.r, data.start, data.end, data.s); //console.log('a(' + data.cx + ',' + data.cy + ',' + data.r + ')');break;
        }
      }
      
      //console.log('stroke');
      ctx.stroke();
    }
  }

  return false;
};

