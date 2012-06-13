/**
 * @fileoverview A bunch of Geometry methods used in various parts of the
 * Google CSS Filter Demo.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.findPolygonIntersections');
goog.provide('gfd.Geometry');
goog.provide('gfd.Point');
goog.provide('gfd.Rectangle');

goog.require('goog.structs.AvlTree');

/**
 * Constant for 2 PI
 * @type {number}
 */
gfd.Geometry.PI_2 = 6.283185307179586;

/**
 * Find a circle that connects the two tangents without the starting point 
 * starting behind the first vector and with the radius remaining inside the
 * radius range.
 */
gfd.Geometry.getCircleConnector = function(t1o, t1d, t2o, t2d, centerOut, out1, out2)
{
  // Equation of line 1
  var mt1 = (t1d.y - t1o.y) / (t1d.x - t1o.x);
  var bt1 = t1o.y - mt1 * t1o.x;
  
  // Equation of line 2
  var mt2 = (t2d.y - t1o.y) / (t2d.x - t1o.x);
  var bt2 = t2o.y - mt2 * t2o.x;
  
  // Intersection of tangents
  var ix = (bt2 - bt1) / (mt1 - mt2);
  var iy = mt1 * ix + bt1;
  var mi = (iy - t1o.y) / (ix - t1o.x);
  
  // Are we headed into the intersection or away?
  var away = mi / Math.abs(mi) != mt1 / Math.abs(mt1);
  
  var a1 = Math.atan(mt1);
  var a2 = Math.atan(mt2);
  if (a1 < 0) a1 += gfd.Geometry.PI_2;
  if (a2 < 0) a2 += gfd.Geometry.PI_2;
  
  // Equation of bisector
  var mbi = Math.tan((a1 + a2) / 2);
  var bbi = iy - mbi * ix;
  
  // 
  var mtp1 = -(1 / mt1);
  var btp1 = t1o.y - mtp1 * t1o.x;
  
  // Intersection of 1st perpendicular
  var ti1x = (btp1 - bbi) / (mbi - mtp1);
  var ti1y = mtp1 * ti1x + btp1;
  var dti1 = Math.sqrt((ti1x - ix) * (ti1x - ix) + (ti1y - iy) * (ti1y - iy));
  
  var mtp2 = -(1 / mt2);
  var btp2 = t2o.y - mtp2 * t2o.x;
  
  //Intersection of 2nd perpendicular
  var ti2x = (btp2 - bbi) / (mbi - btp2);
  var ti2y = mtp2 * ti2x + btp2;
  var dti1 = Math.sqrt((ti2x - ix) * (ti2x - ix) + (ti2y - iy) * (ti2y - iy));
  var dt;
  
  // If headed away from intersection, use the furthest restraint
  if ((away && dti1 > dti2) || (!away && dti1 < dti2))
  {
    centerOut.x = ti1x;
    centerOut.y = ti1y;
    dt = dti1;
  }
  else
  {
    centerOut.x = ti2x;
    centerOut.y = ti2y;
    dt = dti2;
  };
  
  // Now that we know the center point the left and right points are trivial
  var ds = Math.cos(Math.abs(a2 - a1)) / dt;
  
  

  // Return radius
  return Math.tan(Math.abs(a2 - a1)) * 
    Math.sqrt((t1o.x - ix) * (t1o.x - ix) + 
              (t1o.y - iy) * (t1o.y - iy));
};

gfd.Geometry.angleBetween = function(n, a, b, reverse)
{
  var tmp;
  if (reverse)
  {
    tmp = a;
    a = b;
    b = tmp;
  }
  
  n = n < 0 ? gfd.Geometry.PI_2 + n : n;
  a = a < 0 ? gfd.Geometry.PI_2 + a : a;
  b = b < 0 ? gfd.Geometry.PI_2 + b : b;
  if (a < b) return a <= n && n <= b;
  return a <= n || n <= b;
};

gfd.Geometry.angleDif = function(a, b, reverse)
{
  var tmp;
  if (reverse)
  {
    tmp = a;
    a = b;
    b = tmp;
  }
  
  a = a < 0 ? gfd.Geometry.PI_2 + a : a;
  b = b < 0 ? gfd.Geometry.PI_2 + b : b;
  if (a < b) return b - a;
  return gfd.Geometry.PI_2 + b - a;
};

gfd.Geometry.absAngleDif = function(a, b)
{
  a = a < 0 ? gfd.Geometry.PI_2 + a : a;
  b = b < 0 ? gfd.Geometry.PI_2 + b : b;
  return Math.abs(a - b);
};




/**
 * Point, sorry for the uppercase :)
 * @param x
 * @param y
 * @constructor
 */
gfd.Point = function(x, y)
{
  if (x instanceof gfd.Point)
  {
    this.x = x.x;
    this.y = x.y;
  }
  else
  {
    this.x = x;
    this.y = y;
  }
};

gfd.Point.prototype.clone = function()
{
  return new gfd.Point(this.x, this.y);
};



/**
 * Remove points that are colinear.
 * @param {Array.<gfd.Point>} points
 * @param {number} numPoints
 * @param {number} epsilon
 */
gfd.Point.simplify = function(points, numPoints, epsilon)
{
  if (!points) return [];
  if (numPoints > points.length) numPoints = points.length;
  if (numPoints <= 2) return points.slice(0,2);

  var newPoints = [new gfd.Point(points[0]),
                   new gfd.Point(points[1])], 
                   lp2 = points[0], 
                   lp1 = points[1];
  
  var np = 2;
  var lnp = newPoints[1];
  var dx = lp1.x - lp2.x;
  var dy = lp1.y - lp2.y;
  var dist = Math.sqrt(dx * dx + dy * dy);
  
  for (var i = 2; i < numPoints; ++i)
  {
    var p = points[i];
    if (Math.abs((dx * (lp1.y - p.y) - dy * (lp1.x - p.x)) / dist) > epsilon)
    {
      newPoints[np++] = (lnp = new gfd.Point(p.x, p.y));
      lp2 = lp1;
      lp1 = p;
      dx = lp1.x - lp2.x;
      dy = lp1.y - lp2.y;
      dist = Math.sqrt(dx * dx + dy * dy);
    }
    else
    {
      // Just overwrite last point
      lnp.x = p.x;
      lnp.y = p.y;
    }
  }
  
  return newPoints;
};

/**
 * 
 * @param {Array.<gfd.Point>} points
 * @returns {Array.<number>}
 */
gfd.Point.flattenArray = function(points)
{
  var flat = [];
 
  if (points.length)
  {
    var np = points.length;
    flat[0] = points[0].x;
    flat[1] = points[0].y;
    var n = 2;
    for (var i = 1; i < np; i++)
    {
      flat[n++] = points[i].x - points[i-1].x;
      flat[n++] = points[i].y - points[i-1].y;
    }
  }
  
  return flat;
};

gfd.Point.unflattenArray = function(coords)
{
  if (coords.length % 2) return null;
  
  var unflat = [];
  
  if (coords.length)
  {
    var np = coords.length / 2;
    var lp;
    unflat[0] = lp = new gfd.Point(coords[0], coords[1]);
    var n = 2;
    for (var i = 1; i < np; i++, n+=2)
    {
      unflat[i] = lp = new gfd.Point(lp.x + coords[n], lp.y + coords[n+1]);
    }
  }
  
  return unflat;
};

gfd.Point.getInflectionPoints = function(points)
{
  // An inflection point is where the point before the given tangent is on
  // the opposite side of the line from the point after the tangen
  var indices = [];
  var n = 0;
  var l = points.length - 2;
  
  for (var i = 1; i < l; i++)
  {
    var l1 = points[i-1].isLeft(points[i], points[i+1]);
    var l2 = points[i+2].isLeft(points[i], points[i+1]);
    if ((l1 < 0 && l2 > 0) || (l1 > 0 && l2 < 0))
    {
      indices[n++] = i++; // Double increase to avoid double ups
    }
  }
  
  //indices[n++] = points.length - 1;
  
  return indices;
};


gfd.Point.getCriticalPoints = function(points)
{
  var xinc = points[1].x > points[0].x;
  var yinc = points[1].y > points[0].y;
  var indices = [0];
  var n = 1;
  var l = points.length - 1;
  for (var i = 1; i < l; i++)
  {
    if ((xinc && points[i].x <= points[i-1].x) ||
        (!xinc && points[i].x > points[i-1].x))
    {
      xinc = !xinc;
      indices[n++] = i;
    }
    else if ((yinc && points[i].y <= points[i-1].y) ||
            (!yinc && points[i].y > points[i-1].y))
    {
      yinc = !yinc;
      indices[n++] = i;
    }
  }
  
  if (l - indices[n] < 3)
  {
    indices[n] = l;
  }
  else
  {
    indices[n++] = l;
  }
  
  return indices;
  /*
  var maxDist = 0;
  var minDist = Number.MAX_VALUE;
  var dist = [];
  var radius = 3;
  var subradius = 3;
  var avgDist = 0;
  var sumSlope = 0;
  var diam = radius * 2;
  var numPoints = points.length;
  var j = 0;
  var forward = false;
  var i = forward ? -1 : numPoints;

  while(true)
  {    
    if((forward && (++i === numPoints)) ||
       (!forward && (i-- === 0))) break;

    // Get the points around this point
    if (i > radius + subradius && i < numPoints - radius - subradius) 
    {
      // Gathers the distances between projections of the slope of the points, 
      // the highest distance between projections means the highest change
      sumSlope = 0;
      var lastPrjX = 0;
      var lastPrjY = 0;
  
      for (j = i - radius; j < i + radius; j++) 
      {
        if (j !== i) 
        {
          var valBef = points[j - subradius];
          var valAf = points[j + subradius];
  
          if (!valBef || !valAf)
          {
            console.log('error');
          }
          var angle = Math.atan2((valBef.y) - (valAf.y), (valBef.x) - (valAf.x));
          var prjY = Math.sin(angle);
          var prjX = Math.cos(angle);
          
          if( j>i-radius+1){
            
            sumSlope += Math.sqrt( (prjX-lastPrjX)*(prjX-lastPrjX) + (prjY-lastPrjY)*(prjY-lastPrjY) );
            
          }
          
          lastPrjX = prjX;
          lastPrjY = prjY;
  
        }
      }
      
      sumSlope /= diam;
      dist[i] = sumSlope;
      
      avgDist += sumSlope;
      maxDist = Math.max( maxDist, sumSlope );
      minDist = Math.min( minDist, sumSlope );
  
    }
  
  }
  
  avgDist /= (points.length-diam);
  
  var pts = [];
  for(i = 0; i < numPoints; i++ ) {
  
    if( dist[i] > avgDist + (maxDist-avgDist)*0.25 ){
      pts.push(points[i]);
    }
  
  }
  
  return pts;
  */
};

/**
 * @param {gfd.Point} rhs
 * @returns {boolean}
 */
gfd.Point.prototype.equals = function(rhs) {
  return this.x === rhs.x && this.y === rhs.y;
};

//Determines the xy lexicographical order of two points
gfd.Point.prototype.compare = function(rhs){

  // x-coord first
  if (this.x > rhs.x) return  1; 
  if (this.x < rhs.x) return -1;

  // y-coord second
  if (this.y > rhs.y) return  1; 
  if (this.y < rhs.y) return -1;

  // they are the same point
  return 0;  
};

/**
 * @param {gfd.Point} lhs
 * @param {gfd.Point} rhs
 * @returns {boolean}
 */
gfd.Point.compare = function(lhs, rhs) { 
  //x-coord first
  if (lhs.x > rhs.x) return  1; 
  if (lhs.x < rhs.x) return -1;

  // y-coord second
  if (lhs.y > rhs.y) return  1; 
  if (lhs.y < rhs.y) return -1;

  // they are the same point
  return 0; 
};

// tests if point is Left|On|Right of the line P0 to P1.
//
// returns: 
//  >0 for left of the line 
//  0 for on the line
//  <0 for right of the line
gfd.Point.prototype.isLeft = function(p0, p1){
 return (p1.x - p0.x) * (this.y - p0.y) - (this.x - p0.x) * (p1.y - p0.y);  
};


/**
 * A General rectangle object.
 * @param {Number} x
 * @param {Number} y
 * @param {Number} width
 * @param {Number} height
 * @constructor
 */
gfd.Rectangle = function (x, y, width, height)
{
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
};



/**
 * Intersection test with another rect.
 * @param {gfd.Rectangle} rhs
 * @returns {Boolean}
 */
gfd.Rectangle.prototype.intersects = function(rhs)
{
  var x1 = this.x, y1 = this.y, x2 = x1 + this.width, y2 = y1 + this.height,
  x3 = rhs.x, y3 = rhs.y, x4 = x3 + rhs.width, y4 = y3 + rhs.height;
  return (x1<x4 && x2>x3 && y1<y4 && y2>y3);
};

/**
 * A containment test with a point.
 * @param {...*} var_args takes a point or two coordinates
 * @returns {Boolean}
 */
gfd.Rectangle.prototype.contains = function(var_args)
{
  var x, y;
  if (arguments.length === 1) { x = var_args.x, y = var_args.y; }
  else { x = arguments[0], y = arguments[1]; }
  
  return x >= this.x && y >= this.y && x <= (this.x + this.width) &&
    y <= (this.y + this.height);
};

/**
 * An equals test with another rect.
 * @param {gfd.Rectangle} r
 * @returns {Boolean}
 */
gfd.Rectangle.prototype.equals = function(r)
{
  return this.x === r.x && this.y === r.y && this.width == r.width &&
  this.height === r.height;
};

/**
 * Duplicates
 * @returns {gfd.Rectangle}
 */
gfd.Rectangle.prototype.clone = function()
{
  return new gfd.Rectangle(this.x, this.y, this.width, this.height);
};

/**
 * Unions with another rectangle.
 * @param {gfd.Rectangle} rhs
 * @returns {gfd.Rectangle}
 */
gfd.Rectangle.prototype.union = function(rhs)
{
  var x1 = this.x, y1 = this.y, x2 = x1 + this.width, y2 = y1 + this.height,
  x3 = rhs.x, y3 = rhs.y, x4 = x3 + rhs.width, y4 = y3 + rhs.height;
  if (x3 < x1) x1 = x3;
  if (y3 < y1) y1 = y3;
  if (x4 > x2) x2 = x4;
  if (y4 > y2) y2 = y4;
  this.x = x1;
  this.y = y1;
  this.width = x2 - x1;
  this.height = y2 - y1;
  return this;
};

/**
 * Expands the dimensions of the rectangle from the center by the factor.
 * @param {Number} v
 * @returns {gfd.Rectangle}
 */
gfd.Rectangle.prototype.expand = function(v)
{
  var n = v / 2;
  this.x -= n;
  this.y -= n;
  this.width += v;
  this.height += v;
  return this;
};

gfd.Rectangle.prototype.extendTo = function(var_args)
{
  var x, y;
  if (arguments.length === 2)
  {
    x = arguments[0];
    y = arguments[1];
  }
  else
  {
    x = arguments[0].x;
    y = arguments[1].y;
  }
  
  if (x < this.x)
  {
    this.width += (this.x - x);
    this.x = x;
  }
  
  if (y < this.y)
  {
    this.height += (this.y - y);
    this.y = y;
  }
  
  if (x > this.x + this.width)
  {
    this.width += x - this.x - this.width;
  }
  
  if (y > this.y + this.height)
  {
    this.height += y - this.y - this.height;
  }
  
  return this;
};


/**
 * @param {number} edge1
 * @param {number} edge2
 * @param {gfd.Point} v
 * @param {number} t
 * @constructor
 */
gfd.EventQueueEvent = function(edge1, edge2, v, t)
{
  this.e1 = edge1;
  this.e2 = edge2;
  this.vertex = v;
  this.type = t;
};

//Memoization of edges to process
/**
 * @constructor
 */
gfd.EventQueue = function(segments){

  var n = segments.length >> 1;  // Number of segments
  this.events = [];
  var s = 0;
  // build up 2 'events' per edge. One for left vertex, one for right.
  for (var i = 0; i < n; i++, s+=2) 
  {
    var p1 = segments[s];
    var p2 = segments[s+1];
    var e1 = new gfd.EventQueueEvent(i, -1, p1);
    var e2 = new gfd.EventQueueEvent(i, -1, p2);
    
    if (p1.compare(p2) < 0) 
    {
      e1.type = gfd.EventQueue.EventType.LEFT;
      e2.type = gfd.EventQueue.EventType.RIGHT;
    } 
    else 
    {
      e1.type = gfd.EventQueue.EventType.RIGHT;
      e2.type = gfd.EventQueue.EventType.LEFT;   
    }
    
    this.events[s] = e1;
    this.events[s+1] = e2;
  };
  
  // sort events lexicographically
  this.events.sort(function(lhs,rhs){return lhs.vertex.compare(rhs.vertex);});//gfd.EventQueue.compare);
};


// this is only used to add intersections
gfd.EventQueue.prototype.add = function(e1, e2, p, type)
{
  var n = this.events.length - 1;
  var result;
  for (var i = 0; i < n; i++)
  {
    if ((result = p.compare(this.events[i].vertex)) <= 0) 
    {
      if (result === -1)
      {
       // console.log('resplicing at ' + i);
        if (i < n - 1)
        {
          console.log(p.x + ',' + p.y + ':' + this.events[i].vertex.x + ',' + this.events[i].vertex.y);
        }
        
        if (i > 0)
        {
         // console.log('bef ' + this.events[i - 1].vertex.x + ',' + this.events[i - 1].vertex.y);
        }
        this.events.splice(i, 0, new gfd.EventQueueEvent(e1, e2, p, type));
      }
      break;
    }
  }
};

/**
 * @enum {Number}
 */
gfd.EventQueue.EventType = {
    LEFT: 0,
    RIGHT: 1,
    INTERSECTION: 3
};

//S. Tokumine 18/04/2011
//
//Javascript port of http://softsurfer.com/Archive/algorithm_0108/algorithm_0108.htm
//
//The Intersections for a Set of 2D Segments, and Testing Simple Polygons
//
//Shamos-Hoey Algorithm implementation in Javascript
//

//A container class for segments (or edges) of the polygon to test
//Allows storage and retrieval from the Balanced Binary Tree 
/**
 * @constructor
 */
gfd.SweepLineSeg = function(e)
{
  this.edge = e;
  
  /**
   * @type {gfd.Point}
   */
  this.leftPoint;
  
  /**
   * @type {gfd.Point}
   */
  this.rightPoint;
  
  /**
   * @type {number}
   */
  this.slope;
  
  /**
   * @type {boolean}
   */
  this.vertical;
  
  /**
   * @type {number}
   */
  this.b;
  
  /**
   * @type {gfd.SweepLineSeg}
   */
  this.above;
  
  /**
   * @type {gfd.SweepLineSeg}
   */
  this.below;
};

/**
 * @param {gfd.Point} p1
 * @param {gfd.Point} p2
 */
gfd.SweepLineSeg.prototype.setPoints = function(p1, p2)
{
  if (p1.compare(p2) < 0) 
  {
    this.leftPoint = p1;
    this.rightPoint = p2;
  }
  else
  {
    this.leftPoint = p2;
    this.rightPoint = p1;
  }

  if (!(this.vertical = (this.rightPoint.x === this.leftPoint.x)))
  {
    this.slope = (this.rightPoint.y - this.leftPoint.y) / (this.rightPoint.x - this.leftPoint.x);
    this.b = this.leftPoint.y - this.slope * this.leftPoint.x;
  }
};

/**
 * @param lhs
 * @param rhs
 * @returns {number}
 */
gfd.SweepLineSeg.compare = function(lhs, rhs) {

  //if (lhs.edge === rhs.edge) return 0; // Points get modified on a swap so use edge as real 
  if (lhs.leftPoint.y > rhs.leftPoint.y) return 1;
  if (lhs.leftPoint.y < rhs.leftPoint.y) return -1;

  // left side y's are equal, sort by right y's
  if (lhs.rightPoint.y > rhs.rightPoint.y) return 1;
  if (lhs.rightPoint.y < rhs.rightPoint.y) return -1;

  // If we got here and they're not the same point, then they start at the same
  // y coordinate and end at the same y coordinate, if that is the case then
  // we can go by the x coordinate, a lower x coordinate means the line would
  // start to rise sooner so it would be above
  if (lhs.leftPoint.x < rhs.leftPoint.x) return 1;
  if (lhs.leftPoint.x > rhs.leftPoint.x) return -1;
  
  // Finally if we're here, then they have the same start x coordinate
  if (lhs.rightPoint.x < rhs.rightPoint.x) return 1;
  if (lhs.rightPoint.x > rhs.rightPoint.x) return -1;
  
  return 0;  
};

//Main SweepLine class. 
//For full details on the algorithm used, consult the C code here:
//http://softsurfer.com/Archive/algorithm_0108/algorithm_0108.htm
//
//This is a direct port of the above C to Javascript
/**
 * @constructor
 */
gfd.SweepLine = function(segments)
{
  this.x = 0;
  this.tree    = new goog.structs.AvlTree(gfd.SweepLineSeg.compare/*function(lhs, rhs)
  {
    
    if (lhs.edge === rhs.edge) return 0;
    if (lhs.vertical) return -1;
    if (rhs.vertical) return 1;
    var ydif = (lhs.slope * sl.x + lhs.b) - (rhs.slope * sl.x + rhs.b);
    if (ydif === 0)
    {
      if (lhs.leftPoint.x === sl.x)
      {
        return lhs.rightPoint.y > rhs.rightPoint.y ? 1 : -1;
      }
      else if (lhs.rightPoint.x === sl.x)
      {
        return lhs.leftPoint.y > rhs.rightPoint.y ? 1 : -1;
      }
     // We hit an intersection of two points. The algorithm will swap them in a 
     // second kludge and evaluate
      console.log('kludging');
      ydif = (lhs.slope * (sl.x - 0.1) + lhs.b) - (rhs.slope * (sl.x - 0.1) + rhs.b);
      if (ydif === 0) throw 'kludge fail';
    }
    return ydif;
  }*/);
  this.segments = segments;
  this.search = new gfd.SweepLineSeg();
};



//Add Algorithm 'event' (more like unit of analysis) to queue
//Units are segments or distinct edges of the polygon.
gfd.SweepLine.prototype.add = function(edge)
{
  var seg = new gfd.SweepLineSeg(edge);
  seg.setPoints(this.segments[(edge << 1)], this.segments[(edge << 1) + 1]);
  
  // Update sweep line position
  this.x = seg.leftPoint.x;
  
  // Add node to tree and setup linkages to "above" and "below" 
  // edges as per algorithm  
  if (this.tree.add(seg))
  {
    var nx, np, findFirst = true;
    
    // Find previous and next values
    this.tree.inOrderTraverse(function(v) { 
      if (findFirst) {
        if (v !== seg) np = v;
        else findFirst = false;
      }
      else
      {
        nx = v;
        return true;
      }
    });

    if (!findFirst)
    {
      if (nx) 
      {
        seg.above = nx;
        
        if (seg.above.below && !np)
        {
          //throw 'linked list error on add!';
        }
        
        seg.above.below = seg;
        //nx = null;
      }
      
      if (np) 
      {
        seg.below = np;
        
        if (seg.below.above && !nx)
        {
          //throw 'linked list error on add!';
        }
        
        seg.below.above = seg;
        np = null;
      }
    }
    else
    {
      throw 'failed to insert correctly!';
    }
    
    return seg;
  }

  return null; 
};


gfd.SweepLine.prototype.find = function(edge)
{  
  this.search.edge = edge;
  this.search.setPoints(this.segments[(edge << 1)], this.segments[(edge << 1) + 1]);

  var nd;
  this.tree.inOrderTraverse(function(v){nd = v; return true;}, this.search);
  return nd;
};

gfd.SweepLine.prototype.swap = function(se1, se2, vertex)
{
  this.tree.remove(se1);
  this.tree.remove(se2);
  
  se1.leftPoint.x = vertex.x;
  se1.leftPoint.y = vertex.y;
  se2.leftPoint.x = vertex.x;
  se2.leftPoint.y = vertex.y;
  
  se1.setPoints(se1.leftPoint, se1.rightPoint);
  se2.setPoints(se2.leftPoint, se2.rightPoint);
  
  if (se1.above) se1.above.below = se2;
  if (se2.below) se2.below.above = se1;
  
  se1.below = se2.below;
  var temp = se1.above;
  se1.above = se2;
  se2.above = temp;
  se2.below = se1;
  
  this.tree.add(se1);
  this.tree.add(se2);
  
  /*
  // Collect any lines between the two points
  var swapArray = [], findFirst = true;
  //test to see if assumption was correct
  this.tree.inOrderTraverse(function(v) { 
    if (findFirst) {
      if (v === se2 || v === se1)
      {
        swapArray.push(v);
        findFirst = false;
      }
    }
    else
    {
      swapArray.push(v);
      if (v === se1 || v === se2) return true;
    }
  });
  
  
  var t1, t2, t3, n = Math.floor(swapArray.length / 2);
  
  console.log('swapping (reversing) ' + swapArray.length + ' items.');
  
  if (swapArray.length > 2)
  {
    console.log('big');
  }

  if (swapArray.length > 1)
  {
    for (var i = 0; i < n; i++)
    {
      var swap1 = swapArray[i];
      var swap2 = swapArray[n - 1 - i];
      
      console.log('swapping ' + swap1.edge + ' with ' + swap2.edge);
      
      t1 = swap1.leftPoint;
      t2 = swap1.rightPoint;
      t3 = swap1.edge;
      
      swap1.setPoints(swap2.leftPoint, swap2.rightPoint);
      swap1.edge = swap2.edge;
      
      swap2.setPoints(t1, t2);
      swap2.edge = t3;
    }
  }
  */
  /*
  // Physical swap of data but order should stay the same
  var t1 = se1.leftPoint;
  var t2 = se1.rightPoint;
  var t3 = se1.edge;
  
  se1.setPoints(se2.leftPoint, se2.rightPoint);
  se1.edge = se2.edge;

  se2.setPoints(t1, t2);
  se2.edge = t3;
  
  */
  /*
  if (se1.above) se1.above.below = se2;
  if (se2.below) se2.below.above = se1;
  
  se1.below = se2.below;
  var temp = se1.above;
  se1.above = se2;
  se2.above = temp;
  se2.below = se1;
*/
  
  

};

//When removing a node from the tree, ensure the above and below links are 
//passed on to adjacent nodes before node is deleted
gfd.SweepLine.prototype.remove = function(edge)
{
  this.search.edge = edge;
  this.search.setPoints(this.segments[(edge << 1)], this.segments[(edge << 1) + 1]);

  this.x = this.search.rightPoint.x;

  //console.log('searching for edge: ' + edge + ' to remove');
  var seg;
  this.tree.inOrderTraverse(function(v){seg = v; return true;}, this.search);
  
  
  if (!seg)
  {
    throw 'couldnt find object to remove!';
  }
  var nx, np, findFirst = true;
  
  // Find previous and next values
  this.tree.inOrderTraverse(function(v) { 
    if (findFirst) {
      if (v !== seg) np = v;
      else findFirst = false;
    }
    else
    {
      nx = v;
      return true;
    }
  });
  
  if (nx)
  {
    nx.below = seg.below;
    //nx = null;
  }
  else if (seg.above)
  {
    //throw 'link list error on remove!';
  }

  if (np)
  {
    np.above = seg.above;
    //np = null;
  }
  else if (seg.below)
  {
    //throw 'link list error on remove!';
  }
    
  this.tree.remove(seg);  
  return seg;
};


gfd.SweepLine.prototype.intersect = function(s1, s2) 
{
  if (!s1 || !s2) return false; // no intersect if either segment doesn't exist
  
  // check for consecutive edges in polygon
  var e1 = s1.edge, e2 = s2.edge, n = this.segments.length >> 1;
  
  if (((e1+1) % n === e2) || (e1 === (e2+1) % n))
   return null;      // no non-simple intersect since consecutive
  
  // test for existence of an intersect point
  lsign = s2.leftPoint.isLeft(s1.leftPoint, s1.rightPoint);     // s2 left point sign
  rsign = s2.rightPoint.isLeft(s1.leftPoint, s1.rightPoint);    // s2 right point sign
  if (lsign * rsign > 0) // s2 endpoints have same sign relative to s1
     return null;      // => on same side => no intersect is possible
  
  lsign = s1.leftPoint.isLeft(s2.leftPoint, s2.rightPoint);     // s1 left point sign
  rsign = s1.rightPoint.isLeft(s2.leftPoint, s2.rightPoint);    // s1 right point sign
  if (lsign * rsign > 0) // s1 endpoints have same sign relative to s2
     return null;      // => on same side => no intersect is possible
  
  // segments s1 and s2 straddle. Intersect exists.
  
  var p1 = s1.leftPoint, p2 = s1.rightPoint, p3 = s2.leftPoint, p4 = s2.rightPoint;
  var a = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x)) /
            ((p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y ));
  var b = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x)) /
            ((p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y ));
            
  return new gfd.Point(p1.x + a*(p2.x - p1.x), p3.y + b*(p4.y - p3.y ) );
};


/**
 * A static method to decide if a set of points are self-intersecting.
 */
gfd.findPolygonIntersections = function(vertices, opt_quitOnFirst)
{
  var ns = 0;
  var segments = [];

  for (var i = 0; i < vertices.length - 1; i++, ns+=2)
  {
    //console.log('new gfd.Point('+vertices[i].x + ',' + vertices[i].y+'),');
    segments[ns] = /*i > 0 ? segments[ns-1] : */new gfd.Point(vertices[i].x, vertices[i].y);
    segments[ns+1] = new gfd.Point(vertices[i+1].x, vertices[i+1].y);
  }
  
  var queue = new gfd.EventQueue(segments);
  var sl = new gfd.SweepLine(segments);
  var i, e; //intersection point
  var intersections = null;
  // This loop processes all events in the sorted queue
  // Events are only left or right vertices
  while (e = queue.events.shift()) 
  { 
    if (e.type === gfd.EventQueue.EventType.LEFT) 
    {     
      var s;
      
      if (s = sl.add(e.e1))
      {
        //console.log('added ' + e.e1 + (s.above ? ' above:' + s.above.edge : '') + (s.below ? ' below:' + s.below.edge : ''));
        if (s.above && (i = sl.intersect(s, s.above))) 
        {
          if (opt_quitOnFirst) return [i];
          
          //console.log('queueing add intersection above new seg (' + s.above.edge + ',' + s.edge +')');
          queue.add(s.above.edge, s.edge, i, gfd.EventQueue.EventType.INTERSECTION);
        }              
        if (s.below && (i = sl.intersect(s, s.below)))
        {    
          if (opt_quitOnFirst) return [i];
          //console.log('queueing add intersection below new seg (' + s.edge + ',' + s.below.edge + ')');
          queue.add(s.edge, s.below.edge, i, gfd.EventQueue.EventType.INTERSECTION);
        }   
      }
      else
      {
        throw 'couldn\'t add';
      }
    } 
    else if (e.type === gfd.EventQueue.EventType.RIGHT)
    {     
      var s = sl.remove(e.e1);
      
      //console.log('removed ' + e.e1 + (s.above ? ' above:' + s.above.edge : '') + (s.below ? ' below:' + s.below.edge : ''));
      
      if (s.above && s.below && (i = sl.intersect(s.above, s.below))) 
      {
        if (opt_quitOnFirst) return [i];
        //console.log('queueing remove intersection from surrounding segs (' + s.above.edge + ',' + s.below.edge + ')');
        queue.add(s.above.edge, s.below.edge, i, gfd.EventQueue.EventType.INTERSECTION);                  
      }  
    }
    else
    {
      //console.log('visiting intersection between ' + e.e1 + ' and ' + e.e2 + '!');
      if (!intersections) intersections = [];
      intersections.push(e.vertex);
      
      sl.x = e.vertex.x;
      
      var se1 = sl.find(e.e1); // se1 should be above se2 always

      if (se1) 
      {
        var se2 = sl.find(e.e2);

        if (se2) 
        {
          //console.log('swapping ' + se1.edge + ', ' + se2.edge);
          if (se1.below != se2)
          {
            //throw 'swap error ' + e.e2 + ' not below ' + e.e1 + ' is ' + e.e1 + ' above ' + e.e2 + '?' + (se2.above == se1) + '!';
          }
          
          if (se2.above != se1)
          {
            //throw 'swap error ' + e.e1 + ' not above ' + e.e2 + '!';
          }

          sl.swap(se1, se2, e.vertex);
          
          // se1 was above se2
          /*
          var t = se1;
          se1 = se2;
          se2 = t;
          */
          
          if (se2.above && (i = sl.intersect(se2, se2.above))) 
          {
            if (i.x === e.vertex.x && i.y === e.vertex.y)
            {
              //throw 'double intersection';
            }
            else
            {
              //console.log('queueing new above intersection');
              queue.add(se2.above.edge, se2.edge, i, gfd.EventQueue.EventType.INTERSECTION);  
            }
          }
          
          if (se1.below && (i = sl.intersect(se1, se1.below))) 
          {
            if (i.x === e.vertex.x && i.y === e.vertex.y)
            {
              //throw 'double intersection';
            }
            else
            {
              //console.log('queueing new below intersection');
              queue.add(se1.edge, se1.below.edge, i, gfd.EventQueue.EventType.INTERSECTION); 
            }
          }
        }
        else
        {
          throw 'Failed to find second intersecting segment.';
        }
      } 
      else 
      {
        throw 'Failed to find first intersecting segment.';
      }
    }
  }
  
  return intersections;
};
