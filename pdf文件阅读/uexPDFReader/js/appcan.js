/*! iScroll v5.1.3 ~ (c) 2008-2014 Matteo Spinelli ~ http://cubiq.org/license */
(function (window, document, Math) {
var rAF = window.requestAnimationFrame  ||
    window.webkitRequestAnimationFrame  ||
    window.mozRequestAnimationFrame     ||
    window.oRequestAnimationFrame       ||
    window.msRequestAnimationFrame      ||
    function (callback) { window.setTimeout(callback, 1000 / 60); };

var utils = (function () {
    var me = {};

    var _elementStyle = document.createElement('div').style;
    var _vendor = (function () {
        var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
            transform,
            i = 0,
            l = vendors.length;

        for ( ; i < l; i++ ) {
            transform = vendors[i] + 'ransform';
            if ( transform in _elementStyle ) return vendors[i].substr(0, vendors[i].length-1);
        }

        return false;
    })();

    function _prefixStyle (style) {
        if ( _vendor === false ) return false;
        if ( _vendor === '' ) return style;
        return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
    }

    me.getTime = Date.now || function getTime () { return new Date().getTime(); };

    me.extend = function (target, obj) {
        for ( var i in obj ) {
            target[i] = obj[i];
        }
    };

    me.addEvent = function (el, type, fn, capture) {
        el.addEventListener(type, fn, !!capture);
    };

    me.removeEvent = function (el, type, fn, capture) {
        el.removeEventListener(type, fn, !!capture);
    };

    me.prefixPointerEvent = function (pointerEvent) {
        return window.MSPointerEvent ? 
            'MSPointer' + pointerEvent.charAt(9).toUpperCase() + pointerEvent.substr(10):
            pointerEvent;
    };

    me.momentum = function (current, start, time, lowerMargin, wrapperSize, deceleration) {
        var distance = current - start,
            speed = Math.abs(distance) / time,
            destination,
            duration;

        deceleration = deceleration === undefined ? 0.0006 : deceleration;

        destination = current + ( speed * speed ) / ( 2 * deceleration ) * ( distance < 0 ? -1 : 1 );
        duration = speed / deceleration;

        if ( destination < lowerMargin ) {
            destination = wrapperSize ? lowerMargin - ( wrapperSize / 2.5 * ( speed / 8 ) ) : lowerMargin;
            distance = Math.abs(destination - current);
            duration = distance / speed;
        } else if ( destination > 0 ) {
            destination = wrapperSize ? wrapperSize / 2.5 * ( speed / 8 ) : 0;
            distance = Math.abs(current) + destination;
            duration = distance / speed;
        }

        return {
            destination: Math.round(destination),
            duration: duration
        };
    };

    var _transform = _prefixStyle('transform');

    me.extend(me, {
        hasTransform: _transform !== false,
        hasPerspective: _prefixStyle('perspective') in _elementStyle,
        hasTouch: 'ontouchstart' in window,
        hasPointer: window.PointerEvent || window.MSPointerEvent, // IE10 is prefixed
        hasTransition: _prefixStyle('transition') in _elementStyle
    });

    // This should find all Android browsers lower than build 535.19 (both stock browser and webview)
    me.isBadAndroid = /Android /.test(window.navigator.appVersion) && !(/Chrome\/\d/.test(window.navigator.appVersion));

    me.extend(me.style = {}, {
        transform: _transform,
        transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
        transitionDuration: _prefixStyle('transitionDuration'),
        transitionDelay: _prefixStyle('transitionDelay'),
        transformOrigin: _prefixStyle('transformOrigin')
    });

    me.hasClass = function (e, c) {
        var re = new RegExp("(^|\\s)" + c + "(\\s|$)");
        return re.test(e.className);
    };

    me.addClass = function (e, c) {
        if ( me.hasClass(e, c) ) {
            return;
        }

        var newclass = e.className.split(' ');
        newclass.push(c);
        e.className = newclass.join(' ');
    };

    me.removeClass = function (e, c) {
        if ( !me.hasClass(e, c) ) {
            return;
        }

        var re = new RegExp("(^|\\s)" + c + "(\\s|$)", 'g');
        e.className = e.className.replace(re, ' ');
    };

    me.offset = function (el) {
        var left = -el.offsetLeft,
            top = -el.offsetTop;

        // jshint -W084
        while (el = el.offsetParent) {
            left -= el.offsetLeft;
            top -= el.offsetTop;
        }
        // jshint +W084

        return {
            left: left,
            top: top
        };
    };

    me.preventDefaultException = function (el, exceptions) {
        for ( var i in exceptions ) {
            if ( exceptions[i].test(el[i]) ) {
                return true;
            }
        }

        return false;
    };

    me.extend(me.eventType = {}, {
        touchstart: 1,
        touchmove: 1,
        touchend: 1,

        mousedown: 2,
        mousemove: 2,
        mouseup: 2,

        pointerdown: 3,
        pointermove: 3,
        pointerup: 3,

        MSPointerDown: 3,
        MSPointerMove: 3,
        MSPointerUp: 3
    });

    me.extend(me.ease = {}, {
        quadratic: {
            style: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            fn: function (k) {
                return k * ( 2 - k );
            }
        },
        circular: {
            style: 'cubic-bezier(0.1, 0.57, 0.1, 1)',   // Not properly "circular" but this looks better, it should be (0.075, 0.82, 0.165, 1)
            fn: function (k) {
                return Math.sqrt( 1 - ( --k * k ) );
            }
        },
        back: {
            style: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            fn: function (k) {
                var b = 4;
                return ( k = k - 1 ) * k * ( ( b + 1 ) * k + b ) + 1;
            }
        },
        bounce: {
            style: '',
            fn: function (k) {
                if ( ( k /= 1 ) < ( 1 / 2.75 ) ) {
                    return 7.5625 * k * k;
                } else if ( k < ( 2 / 2.75 ) ) {
                    return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;
                } else if ( k < ( 2.5 / 2.75 ) ) {
                    return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;
                } else {
                    return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;
                }
            }
        },
        elastic: {
            style: '',
            fn: function (k) {
                var f = 0.22,
                    e = 0.4;

                if ( k === 0 ) { return 0; }
                if ( k == 1 ) { return 1; }

                return ( e * Math.pow( 2, - 10 * k ) * Math.sin( ( k - f / 4 ) * ( 2 * Math.PI ) / f ) + 1 );
            }
        }
    });

    me.tap = function (e, eventName) {
        var ev = document.createEvent('Event');
        ev.initEvent(eventName, true, true);
        ev.pageX = e.pageX;
        ev.pageY = e.pageY;
        e.target.dispatchEvent(ev);
    };

    me.click = function (e) {
        var target = e.target,
            ev;

        if ( !(/(SELECT|INPUT|TEXTAREA)/i).test(target.tagName) ) {
            ev = document.createEvent('MouseEvents');
            ev.initMouseEvent('click', true, true, e.view, 1,
                target.screenX, target.screenY, target.clientX, target.clientY,
                e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                0, null);

            ev._constructed = true;
            target.dispatchEvent(ev);
        }
    };

    return me;
})();

function IScroll (el, options) {
    this.wrapper = typeof el == 'string' ? document.querySelector(el) : el;
    this.scroller = this.wrapper.children[0];
    this.scrollerStyle = this.scroller.style;       // cache style for better performance

    this.options = {

        resizeScrollbars: true,

        mouseWheelSpeed: 20,

        snapThreshold: 0.334,

// INSERT POINT: OPTIONS 

        startX: 0,
        startY: 0,
        scrollY: true,
        directionLockThreshold: 5,
        momentum: true,

        bounce: true,
        bounceTime: 600,
        bounceEasing: '',

        preventDefault: true,
        preventDefaultException: { tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/ },

        HWCompositing: true,
        useTransition: true,
        useTransform: true
    };

    for ( var i in options ) {
        this.options[i] = options[i];
    }

    // Normalize options
    this.translateZ = this.options.HWCompositing && utils.hasPerspective ? ' translateZ(0)' : '';

    this.options.useTransition = utils.hasTransition && this.options.useTransition;
    this.options.useTransform = utils.hasTransform && this.options.useTransform;

    this.options.eventPassthrough = this.options.eventPassthrough === true ? 'vertical' : this.options.eventPassthrough;
    this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault;

    // If you want eventPassthrough I have to lock one of the axes
    this.options.scrollY = this.options.eventPassthrough == 'vertical' ? false : this.options.scrollY;
    this.options.scrollX = this.options.eventPassthrough == 'horizontal' ? false : this.options.scrollX;

    // With eventPassthrough we also need lockDirection mechanism
    this.options.freeScroll = this.options.freeScroll && !this.options.eventPassthrough;
    this.options.directionLockThreshold = this.options.eventPassthrough ? 0 : this.options.directionLockThreshold;

    this.options.bounceEasing = typeof this.options.bounceEasing == 'string' ? utils.ease[this.options.bounceEasing] || utils.ease.circular : this.options.bounceEasing;

    this.options.resizePolling = this.options.resizePolling === undefined ? 60 : this.options.resizePolling;

    if ( this.options.tap === true ) {
        this.options.tap = 'tap';
    }

    if ( this.options.shrinkScrollbars == 'scale' ) {
        this.options.useTransition = false;
    }

    this.options.invertWheelDirection = this.options.invertWheelDirection ? -1 : 1;

// INSERT POINT: NORMALIZATION

    // Some defaults    
    this.x = 0;
    this.y = 0;
    this.directionX = 0;
    this.directionY = 0;
    this._events = {};

// INSERT POINT: DEFAULTS

    this._init();
    this.refresh();

    this.scrollTo(this.options.startX, this.options.startY);
    this.enable();
}

IScroll.prototype = {
    version: '5.1.3',

    _init: function () {
        this._initEvents();

        if ( this.options.scrollbars || this.options.indicators ) {
            this._initIndicators();
        }

        if ( this.options.mouseWheel ) {
            this._initWheel();
        }

        if ( this.options.snap ) {
            this._initSnap();
        }

        if ( this.options.keyBindings ) {
            this._initKeys();
        }

// INSERT POINT: _init

    },

    destroy: function () {
        this._initEvents(true);

        this._execEvent('destroy');
    },

    _transitionEnd: function (e) {
        if ( e.target != this.scroller || !this.isInTransition ) {
            return;
        }

        this._transitionTime();
        if ( !this.resetPosition(this.options.bounceTime) ) {
            this.isInTransition = false;
            this._execEvent('scrollEnd');
        }
    },

    _start: function (e) {
        // React to left mouse button only
        if ( utils.eventType[e.type] != 1 ) {
            if ( e.button !== 0 ) {
                return;
            }
        }

        if ( !this.enabled || (this.initiated && utils.eventType[e.type] !== this.initiated) ) {
            return;
        }

        if ( this.options.preventDefault && !utils.isBadAndroid && !utils.preventDefaultException(e.target, this.options.preventDefaultException) ) {
            e.preventDefault();
        }

        var point = e.touches ? e.touches[0] : e,
            pos;

        this.initiated  = utils.eventType[e.type];
        this.moved      = false;
        this.distX      = 0;
        this.distY      = 0;
        this.directionX = 0;
        this.directionY = 0;
        this.directionLocked = 0;

        this._transitionTime();

        this.startTime = utils.getTime();

        if ( this.options.useTransition && this.isInTransition ) {
            this.isInTransition = false;
            pos = this.getComputedPosition();
            this._translate(Math.round(pos.x), Math.round(pos.y));
            this._execEvent('scrollEnd');
        } else if ( !this.options.useTransition && this.isAnimating ) {
            this.isAnimating = false;
            this._execEvent('scrollEnd');
        }

        this.startX    = this.x;
        this.startY    = this.y;
        this.absStartX = this.x;
        this.absStartY = this.y;
        this.pointX    = point.pageX;
        this.pointY    = point.pageY;

        this._execEvent('beforeScrollStart');
    },

    _move: function (e) {
        if ( !this.enabled || utils.eventType[e.type] !== this.initiated ) {
            return;
        }

        if ( this.options.preventDefault ) {    // increases performance on Android? TODO: check!
            e.preventDefault();
        }

        var point       = e.touches ? e.touches[0] : e,
            deltaX      = point.pageX - this.pointX,
            deltaY      = point.pageY - this.pointY,
            timestamp   = utils.getTime(),
            newX, newY,
            absDistX, absDistY;

        this.pointX     = point.pageX;
        this.pointY     = point.pageY;

        this.distX      += deltaX;
        this.distY      += deltaY;
        absDistX        = Math.abs(this.distX);
        absDistY        = Math.abs(this.distY);

        // We need to move at least 10 pixels for the scrolling to initiate
        if ( timestamp - this.endTime > 300 && (absDistX < 10 && absDistY < 10) ) {
            return;
        }

        // If you are scrolling in one direction lock the other
        if ( !this.directionLocked && !this.options.freeScroll ) {
            if ( absDistX > absDistY + this.options.directionLockThreshold ) {
                this.directionLocked = 'h';     // lock horizontally
            } else if ( absDistY >= absDistX + this.options.directionLockThreshold ) {
                this.directionLocked = 'v';     // lock vertically
            } else {
                this.directionLocked = 'n';     // no lock
            }
        }

        if ( this.directionLocked == 'h' ) {
            if ( this.options.eventPassthrough == 'vertical' ) {
                e.preventDefault();
            } else if ( this.options.eventPassthrough == 'horizontal' ) {
                this.initiated = false;
                return;
            }

            deltaY = 0;
        } else if ( this.directionLocked == 'v' ) {
            if ( this.options.eventPassthrough == 'horizontal' ) {
                e.preventDefault();
            } else if ( this.options.eventPassthrough == 'vertical' ) {
                this.initiated = false;
                return;
            }

            deltaX = 0;
        }

        deltaX = this.hasHorizontalScroll ? deltaX : 0;
        deltaY = this.hasVerticalScroll ? deltaY : 0;

        newX = this.x + deltaX;
        newY = this.y + deltaY;

        // Slow down if outside of the boundaries
        if ( newX > 0 || newX < this.maxScrollX ) {
            newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
        }
        if ( newY > 0 || newY < this.maxScrollY ) {
            newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
        }

        this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
        this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

        if ( !this.moved ) {
            this._execEvent('scrollStart');
        }

        this.moved = true;

        this._translate(newX, newY);

/* REPLACE START: _move */

        if ( timestamp - this.startTime > 300 ) {
            this.startTime = timestamp;
            this.startX = this.x;
            this.startY = this.y;
        }

/* REPLACE END: _move */

    },

    _end: function (e) {
        if ( !this.enabled || utils.eventType[e.type] !== this.initiated ) {
            return;
        }

        if ( this.options.preventDefault && !utils.preventDefaultException(e.target, this.options.preventDefaultException) ) {
            e.preventDefault();
        }

        var point = e.changedTouches ? e.changedTouches[0] : e,
            momentumX,
            momentumY,
            duration = utils.getTime() - this.startTime,
            newX = Math.round(this.x),
            newY = Math.round(this.y),
            distanceX = Math.abs(newX - this.startX),
            distanceY = Math.abs(newY - this.startY),
            time = 0,
            easing = '';

        this.isInTransition = 0;
        this.initiated = 0;
        this.endTime = utils.getTime();

        // reset if we are outside of the boundaries
        if ( this.resetPosition(this.options.bounceTime) ) {
            return;
        }

        this.scrollTo(newX, newY);  // ensures that the last position is rounded

        // we scrolled less than 10 pixels
        if ( !this.moved ) {
            if ( this.options.tap ) {
                utils.tap(e, this.options.tap);
            }

            if ( this.options.click ) {
                utils.click(e);
            }

            this._execEvent('scrollCancel');
            return;
        }

        if ( this._events.flick && duration < 200 && distanceX < 100 && distanceY < 100 ) {
            this._execEvent('flick');
            return;
        }

        // start momentum animation if needed
        if ( this.options.momentum && duration < 300 ) {
            momentumX = this.hasHorizontalScroll ? utils.momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ? this.wrapperWidth : 0, this.options.deceleration) : { destination: newX, duration: 0 };
            momentumY = this.hasVerticalScroll ? utils.momentum(this.y, this.startY, duration, this.maxScrollY, this.options.bounce ? this.wrapperHeight : 0, this.options.deceleration) : { destination: newY, duration: 0 };
            newX = momentumX.destination;
            newY = momentumY.destination;
            time = Math.max(momentumX.duration, momentumY.duration);
            this.isInTransition = 1;
        }


        if ( this.options.snap ) {
            var snap = this._nearestSnap(newX, newY);
            this.currentPage = snap;
            time = this.options.snapSpeed || Math.max(
                    Math.max(
                        Math.min(Math.abs(newX - snap.x), 1000),
                        Math.min(Math.abs(newY - snap.y), 1000)
                    ), 300);
            newX = snap.x;
            newY = snap.y;

            this.directionX = 0;
            this.directionY = 0;
            easing = this.options.bounceEasing;
        }

// INSERT POINT: _end

        if ( newX != this.x || newY != this.y ) {
            // change easing function when scroller goes out of the boundaries
            if ( newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY ) {
                easing = utils.ease.quadratic;
            }

            this.scrollTo(newX, newY, time, easing);
            return;
        }

        this._execEvent('scrollEnd');
    },

    _resize: function () {
        var that = this;

        clearTimeout(this.resizeTimeout);

        this.resizeTimeout = setTimeout(function () {
            that.refresh();
        }, this.options.resizePolling);
    },

    resetPosition: function (time) {
        var x = this.x,
            y = this.y;

        time = time || 0;

        if ( !this.hasHorizontalScroll || this.x > 0 ) {
            x = 0;
        } else if ( this.x < this.maxScrollX ) {
            x = this.maxScrollX;
        }

        if ( !this.hasVerticalScroll || this.y > 0 ) {
            y = 0;
        } else if ( this.y < this.maxScrollY ) {
            y = this.maxScrollY;
        }

        if ( x == this.x && y == this.y ) {
            return false;
        }

        this.scrollTo(x, y, time, this.options.bounceEasing);

        return true;
    },

    disable: function () {
        this.enabled = false;
    },

    enable: function () {
        this.enabled = true;
    },

    refresh: function () {
        var rf = this.wrapper.offsetHeight;     // Force reflow

        this.wrapperWidth   = this.wrapper.clientWidth;
        this.wrapperHeight  = this.wrapper.clientHeight;

/* REPLACE START: refresh */

        this.scrollerWidth  = this.scroller.offsetWidth;
        this.scrollerHeight = this.scroller.offsetHeight;

        this.maxScrollX     = this.wrapperWidth - this.scrollerWidth;
        this.maxScrollY     = this.wrapperHeight - this.scrollerHeight;

/* REPLACE END: refresh */

        this.hasHorizontalScroll    = this.options.scrollX && this.maxScrollX < 0;
        this.hasVerticalScroll      = this.options.scrollY && this.maxScrollY < 0;

        if ( !this.hasHorizontalScroll ) {
            this.maxScrollX = 0;
            this.scrollerWidth = this.wrapperWidth;
        }

        if ( !this.hasVerticalScroll ) {
            this.maxScrollY = 0;
            this.scrollerHeight = this.wrapperHeight;
        }

        this.endTime = 0;
        this.directionX = 0;
        this.directionY = 0;

        this.wrapperOffset = utils.offset(this.wrapper);

        this._execEvent('refresh');

        this.resetPosition();

// INSERT POINT: _refresh

    },

    on: function (type, fn) {
        if ( !this._events[type] ) {
            this._events[type] = [];
        }

        this._events[type].push(fn);
    },

    off: function (type, fn) {
        if ( !this._events[type] ) {
            return;
        }

        var index = this._events[type].indexOf(fn);

        if ( index > -1 ) {
            this._events[type].splice(index, 1);
        }
    },

    _execEvent: function (type) {
        if ( !this._events[type] ) {
            return;
        }

        var i = 0,
            l = this._events[type].length;

        if ( !l ) {
            return;
        }

        for ( ; i < l; i++ ) {
            this._events[type][i].apply(this, [].slice.call(arguments, 1));
        }
    },

    scrollBy: function (x, y, time, easing) {
        x = this.x + x;
        y = this.y + y;
        time = time || 0;

        this.scrollTo(x, y, time, easing);
    },

    scrollTo: function (x, y, time, easing) {
        easing = easing || utils.ease.circular;

        this.isInTransition = this.options.useTransition && time > 0;

        if ( !time || (this.options.useTransition && easing.style) ) {
            this._transitionTimingFunction(easing.style);
            this._transitionTime(time);
            this._translate(x, y);
        } else {
            this._animate(x, y, time, easing.fn);
        }
    },

    scrollToElement: function (el, time, offsetX, offsetY, easing) {
        el = el.nodeType ? el : this.scroller.querySelector(el);

        if ( !el ) {
            return;
        }

        var pos = utils.offset(el);

        pos.left -= this.wrapperOffset.left;
        pos.top  -= this.wrapperOffset.top;

        // if offsetX/Y are true we center the element to the screen
        if ( offsetX === true ) {
            offsetX = Math.round(el.offsetWidth / 2 - this.wrapper.offsetWidth / 2);
        }
        if ( offsetY === true ) {
            offsetY = Math.round(el.offsetHeight / 2 - this.wrapper.offsetHeight / 2);
        }

        pos.left -= offsetX || 0;
        pos.top  -= offsetY || 0;

        pos.left = pos.left > 0 ? 0 : pos.left < this.maxScrollX ? this.maxScrollX : pos.left;
        pos.top  = pos.top  > 0 ? 0 : pos.top  < this.maxScrollY ? this.maxScrollY : pos.top;

        time = time === undefined || time === null || time === 'auto' ? Math.max(Math.abs(this.x-pos.left), Math.abs(this.y-pos.top)) : time;

        this.scrollTo(pos.left, pos.top, time, easing);
    },

    _transitionTime: function (time) {
        time = time || 0;

        this.scrollerStyle[utils.style.transitionDuration] = time + 'ms';

        if ( !time && utils.isBadAndroid ) {
            this.scrollerStyle[utils.style.transitionDuration] = '0.001s';
        }


        if ( this.indicators ) {
            for ( var i = this.indicators.length; i--; ) {
                this.indicators[i].transitionTime(time);
            }
        }


// INSERT POINT: _transitionTime

    },

    _transitionTimingFunction: function (easing) {
        this.scrollerStyle[utils.style.transitionTimingFunction] = easing;


        if ( this.indicators ) {
            for ( var i = this.indicators.length; i--; ) {
                this.indicators[i].transitionTimingFunction(easing);
            }
        }


// INSERT POINT: _transitionTimingFunction

    },

    _translate: function (x, y) {
        if ( this.options.useTransform ) {

/* REPLACE START: _translate */

            this.scrollerStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.translateZ;

/* REPLACE END: _translate */

        } else {
            x = Math.round(x);
            y = Math.round(y);
            this.scrollerStyle.left = x + 'px';
            this.scrollerStyle.top = y + 'px';
        }

        this.x = x;
        this.y = y;


    if ( this.indicators ) {
        for ( var i = this.indicators.length; i--; ) {
            this.indicators[i].updatePosition();
        }
    }


// INSERT POINT: _translate

    },

    _initEvents: function (remove) {
        var eventType = remove ? utils.removeEvent : utils.addEvent,
            target = this.options.bindToWrapper ? this.wrapper : window;

        eventType(window, 'orientationchange', this);
        eventType(window, 'resize', this);

        if ( this.options.click ) {
            eventType(this.wrapper, 'click', this, true);
        }

        if ( !this.options.disableMouse ) {
            eventType(this.wrapper, 'mousedown', this);
            eventType(target, 'mousemove', this);
            eventType(target, 'mousecancel', this);
            eventType(target, 'mouseup', this);
        }

        if ( utils.hasPointer && !this.options.disablePointer ) {
            eventType(this.wrapper, utils.prefixPointerEvent('pointerdown'), this);
            eventType(target, utils.prefixPointerEvent('pointermove'), this);
            eventType(target, utils.prefixPointerEvent('pointercancel'), this);
            eventType(target, utils.prefixPointerEvent('pointerup'), this);
        }

        if ( utils.hasTouch && !this.options.disableTouch ) {
            eventType(this.wrapper, 'touchstart', this);
            eventType(target, 'touchmove', this);
            eventType(target, 'touchcancel', this);
            eventType(target, 'touchend', this);
        }

        eventType(this.scroller, 'transitionend', this);
        eventType(this.scroller, 'webkitTransitionEnd', this);
        eventType(this.scroller, 'oTransitionEnd', this);
        eventType(this.scroller, 'MSTransitionEnd', this);
    },

    getComputedPosition: function () {
        var matrix = window.getComputedStyle(this.scroller, null),
            x, y;

        if ( this.options.useTransform ) {
            matrix = matrix[utils.style.transform].split(')')[0].split(', ');
            x = +(matrix[12] || matrix[4]);
            y = +(matrix[13] || matrix[5]);
        } else {
            x = +matrix.left.replace(/[^-\d.]/g, '');
            y = +matrix.top.replace(/[^-\d.]/g, '');
        }

        return { x: x, y: y };
    },

    _initIndicators: function () {
        var interactive = this.options.interactiveScrollbars,
            customStyle = typeof this.options.scrollbars != 'string',
            indicators = [],
            indicator;

        var that = this;

        this.indicators = [];

        if ( this.options.scrollbars ) {
            // Vertical scrollbar
            if ( this.options.scrollY ) {
                indicator = {
                    el: createDefaultScrollbar('v', interactive, this.options.scrollbars),
                    interactive: interactive,
                    defaultScrollbars: true,
                    customStyle: customStyle,
                    resize: this.options.resizeScrollbars,
                    shrink: this.options.shrinkScrollbars,
                    fade: this.options.fadeScrollbars,
                    listenX: false
                };

                this.wrapper.appendChild(indicator.el);
                indicators.push(indicator);
            }

            // Horizontal scrollbar
            if ( this.options.scrollX ) {
                indicator = {
                    el: createDefaultScrollbar('h', interactive, this.options.scrollbars),
                    interactive: interactive,
                    defaultScrollbars: true,
                    customStyle: customStyle,
                    resize: this.options.resizeScrollbars,
                    shrink: this.options.shrinkScrollbars,
                    fade: this.options.fadeScrollbars,
                    listenY: false
                };

                this.wrapper.appendChild(indicator.el);
                indicators.push(indicator);
            }
        }

        if ( this.options.indicators ) {
            // TODO: check concat compatibility
            indicators = indicators.concat(this.options.indicators);
        }

        for ( var i = indicators.length; i--; ) {
            this.indicators.push( new Indicator(this, indicators[i]) );
        }

        // TODO: check if we can use array.map (wide compatibility and performance issues)
        function _indicatorsMap (fn) {
            for ( var i = that.indicators.length; i--; ) {
                fn.call(that.indicators[i]);
            }
        }

        if ( this.options.fadeScrollbars ) {
            this.on('scrollEnd', function () {
                _indicatorsMap(function () {
                    this.fade();
                });
            });

            this.on('scrollCancel', function () {
                _indicatorsMap(function () {
                    this.fade();
                });
            });

            this.on('scrollStart', function () {
                _indicatorsMap(function () {
                    this.fade(1);
                });
            });

            this.on('beforeScrollStart', function () {
                _indicatorsMap(function () {
                    this.fade(1, true);
                });
            });
        }


        this.on('refresh', function () {
            _indicatorsMap(function () {
                this.refresh();
            });
        });

        this.on('destroy', function () {
            _indicatorsMap(function () {
                this.destroy();
            });

            delete this.indicators;
        });
    },

    _initWheel: function () {
        utils.addEvent(this.wrapper, 'wheel', this);
        utils.addEvent(this.wrapper, 'mousewheel', this);
        utils.addEvent(this.wrapper, 'DOMMouseScroll', this);

        this.on('destroy', function () {
            utils.removeEvent(this.wrapper, 'wheel', this);
            utils.removeEvent(this.wrapper, 'mousewheel', this);
            utils.removeEvent(this.wrapper, 'DOMMouseScroll', this);
        });
    },

    _wheel: function (e) {
        if ( !this.enabled ) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        var wheelDeltaX, wheelDeltaY,
            newX, newY,
            that = this;

        if ( this.wheelTimeout === undefined ) {
            that._execEvent('scrollStart');
        }

        // Execute the scrollEnd event after 400ms the wheel stopped scrolling
        clearTimeout(this.wheelTimeout);
        this.wheelTimeout = setTimeout(function () {
            that._execEvent('scrollEnd');
            that.wheelTimeout = undefined;
        }, 400);

        if ( 'deltaX' in e ) {
            if (e.deltaMode === 1) {
                wheelDeltaX = -e.deltaX * this.options.mouseWheelSpeed;
                wheelDeltaY = -e.deltaY * this.options.mouseWheelSpeed;
            } else {
                wheelDeltaX = -e.deltaX;
                wheelDeltaY = -e.deltaY;
            }
        } else if ( 'wheelDeltaX' in e ) {
            wheelDeltaX = e.wheelDeltaX / 120 * this.options.mouseWheelSpeed;
            wheelDeltaY = e.wheelDeltaY / 120 * this.options.mouseWheelSpeed;
        } else if ( 'wheelDelta' in e ) {
            wheelDeltaX = wheelDeltaY = e.wheelDelta / 120 * this.options.mouseWheelSpeed;
        } else if ( 'detail' in e ) {
            wheelDeltaX = wheelDeltaY = -e.detail / 3 * this.options.mouseWheelSpeed;
        } else {
            return;
        }

        wheelDeltaX *= this.options.invertWheelDirection;
        wheelDeltaY *= this.options.invertWheelDirection;

        if ( !this.hasVerticalScroll ) {
            wheelDeltaX = wheelDeltaY;
            wheelDeltaY = 0;
        }

        if ( this.options.snap ) {
            newX = this.currentPage.pageX;
            newY = this.currentPage.pageY;

            if ( wheelDeltaX > 0 ) {
                newX--;
            } else if ( wheelDeltaX < 0 ) {
                newX++;
            }

            if ( wheelDeltaY > 0 ) {
                newY--;
            } else if ( wheelDeltaY < 0 ) {
                newY++;
            }

            this.goToPage(newX, newY);

            return;
        }

        newX = this.x + Math.round(this.hasHorizontalScroll ? wheelDeltaX : 0);
        newY = this.y + Math.round(this.hasVerticalScroll ? wheelDeltaY : 0);

        if ( newX > 0 ) {
            newX = 0;
        } else if ( newX < this.maxScrollX ) {
            newX = this.maxScrollX;
        }

        if ( newY > 0 ) {
            newY = 0;
        } else if ( newY < this.maxScrollY ) {
            newY = this.maxScrollY;
        }

        this.scrollTo(newX, newY, 0);

// INSERT POINT: _wheel
    },

    _initSnap: function () {
        this.currentPage = {};

        if ( typeof this.options.snap == 'string' ) {
            this.options.snap = this.scroller.querySelectorAll(this.options.snap);
        }

        this.on('refresh', function () {
            var i = 0, l,
                m = 0, n,
                cx, cy,
                x = 0, y,
                stepX = this.options.snapStepX || this.wrapperWidth,
                stepY = this.options.snapStepY || this.wrapperHeight,
                el;

            this.pages = [];

            if ( !this.wrapperWidth || !this.wrapperHeight || !this.scrollerWidth || !this.scrollerHeight ) {
                return;
            }

            if ( this.options.snap === true ) {
                cx = Math.round( stepX / 2 );
                cy = Math.round( stepY / 2 );

                while ( x > -this.scrollerWidth ) {
                    this.pages[i] = [];
                    l = 0;
                    y = 0;

                    while ( y > -this.scrollerHeight ) {
                        this.pages[i][l] = {
                            x: Math.max(x, this.maxScrollX),
                            y: Math.max(y, this.maxScrollY),
                            width: stepX,
                            height: stepY,
                            cx: x - cx,
                            cy: y - cy
                        };

                        y -= stepY;
                        l++;
                    }

                    x -= stepX;
                    i++;
                }
            } else {
                el = this.options.snap;
                l = el.length;
                n = -1;

                for ( ; i < l; i++ ) {
                    if ( i === 0 || el[i].offsetLeft <= el[i-1].offsetLeft ) {
                        m = 0;
                        n++;
                    }

                    if ( !this.pages[m] ) {
                        this.pages[m] = [];
                    }

                    x = Math.max(-el[i].offsetLeft, this.maxScrollX);
                    y = Math.max(-el[i].offsetTop, this.maxScrollY);
                    cx = x - Math.round(el[i].offsetWidth / 2);
                    cy = y - Math.round(el[i].offsetHeight / 2);

                    this.pages[m][n] = {
                        x: x,
                        y: y,
                        width: el[i].offsetWidth,
                        height: el[i].offsetHeight,
                        cx: cx,
                        cy: cy
                    };

                    if ( x > this.maxScrollX ) {
                        m++;
                    }
                }
            }

            this.goToPage(this.currentPage.pageX || 0, this.currentPage.pageY || 0, 0);

            // Update snap threshold if needed
            if ( this.options.snapThreshold % 1 === 0 ) {
                this.snapThresholdX = this.options.snapThreshold;
                this.snapThresholdY = this.options.snapThreshold;
            } else {
                this.snapThresholdX = Math.round(this.pages[this.currentPage.pageX][this.currentPage.pageY].width * this.options.snapThreshold);
                this.snapThresholdY = Math.round(this.pages[this.currentPage.pageX][this.currentPage.pageY].height * this.options.snapThreshold);
            }
        });

        this.on('flick', function () {
            var time = this.options.snapSpeed || Math.max(
                    Math.max(
                        Math.min(Math.abs(this.x - this.startX), 1000),
                        Math.min(Math.abs(this.y - this.startY), 1000)
                    ), 300);

            this.goToPage(
                this.currentPage.pageX + this.directionX,
                this.currentPage.pageY + this.directionY,
                time
            );
        });
    },

    _nearestSnap: function (x, y) {
        if ( !this.pages.length ) {
            return { x: 0, y: 0, pageX: 0, pageY: 0 };
        }

        var i = 0,
            l = this.pages.length,
            m = 0;

        // Check if we exceeded the snap threshold
        if ( Math.abs(x - this.absStartX) < this.snapThresholdX &&
            Math.abs(y - this.absStartY) < this.snapThresholdY ) {
            return this.currentPage;
        }

        if ( x > 0 ) {
            x = 0;
        } else if ( x < this.maxScrollX ) {
            x = this.maxScrollX;
        }

        if ( y > 0 ) {
            y = 0;
        } else if ( y < this.maxScrollY ) {
            y = this.maxScrollY;
        }

        for ( ; i < l; i++ ) {
            if ( x >= this.pages[i][0].cx ) {
                x = this.pages[i][0].x;
                break;
            }
        }

        l = this.pages[i].length;

        for ( ; m < l; m++ ) {
            if ( y >= this.pages[0][m].cy ) {
                y = this.pages[0][m].y;
                break;
            }
        }

        if ( i == this.currentPage.pageX ) {
            i += this.directionX;

            if ( i < 0 ) {
                i = 0;
            } else if ( i >= this.pages.length ) {
                i = this.pages.length - 1;
            }

            x = this.pages[i][0].x;
        }

        if ( m == this.currentPage.pageY ) {
            m += this.directionY;

            if ( m < 0 ) {
                m = 0;
            } else if ( m >= this.pages[0].length ) {
                m = this.pages[0].length - 1;
            }

            y = this.pages[0][m].y;
        }

        return {
            x: x,
            y: y,
            pageX: i,
            pageY: m
        };
    },

    goToPage: function (x, y, time, easing) {
        easing = easing || this.options.bounceEasing;

        if ( x >= this.pages.length ) {
            x = this.pages.length - 1;
        } else if ( x < 0 ) {
            x = 0;
        }

        if ( y >= this.pages[x].length ) {
            y = this.pages[x].length - 1;
        } else if ( y < 0 ) {
            y = 0;
        }

        var posX = this.pages[x][y].x,
            posY = this.pages[x][y].y;

        time = time === undefined ? this.options.snapSpeed || Math.max(
            Math.max(
                Math.min(Math.abs(posX - this.x), 1000),
                Math.min(Math.abs(posY - this.y), 1000)
            ), 300) : time;

        this.currentPage = {
            x: posX,
            y: posY,
            pageX: x,
            pageY: y
        };

        this.scrollTo(posX, posY, time, easing);
    },

    next: function (time, easing) {
        var x = this.currentPage.pageX,
            y = this.currentPage.pageY;

        x++;

        if ( x >= this.pages.length && this.hasVerticalScroll ) {
            x = 0;
            y++;
        }

        this.goToPage(x, y, time, easing);
    },

    prev: function (time, easing) {
        var x = this.currentPage.pageX,
            y = this.currentPage.pageY;

        x--;

        if ( x < 0 && this.hasVerticalScroll ) {
            x = 0;
            y--;
        }

        this.goToPage(x, y, time, easing);
    },

    _initKeys: function (e) {
        // default key bindings
        var keys = {
            pageUp: 33,
            pageDown: 34,
            end: 35,
            home: 36,
            left: 37,
            up: 38,
            right: 39,
            down: 40
        };
        var i;

        // if you give me characters I give you keycode
        if ( typeof this.options.keyBindings == 'object' ) {
            for ( i in this.options.keyBindings ) {
                if ( typeof this.options.keyBindings[i] == 'string' ) {
                    this.options.keyBindings[i] = this.options.keyBindings[i].toUpperCase().charCodeAt(0);
                }
            }
        } else {
            this.options.keyBindings = {};
        }

        for ( i in keys ) {
            this.options.keyBindings[i] = this.options.keyBindings[i] || keys[i];
        }

        utils.addEvent(window, 'keydown', this);

        this.on('destroy', function () {
            utils.removeEvent(window, 'keydown', this);
        });
    },

    _key: function (e) {
        if ( !this.enabled ) {
            return;
        }

        var snap = this.options.snap,   // we are using this alot, better to cache it
            newX = snap ? this.currentPage.pageX : this.x,
            newY = snap ? this.currentPage.pageY : this.y,
            now = utils.getTime(),
            prevTime = this.keyTime || 0,
            acceleration = 0.250,
            pos;

        if ( this.options.useTransition && this.isInTransition ) {
            pos = this.getComputedPosition();

            this._translate(Math.round(pos.x), Math.round(pos.y));
            this.isInTransition = false;
        }

        this.keyAcceleration = now - prevTime < 200 ? Math.min(this.keyAcceleration + acceleration, 50) : 0;

        switch ( e.keyCode ) {
            case this.options.keyBindings.pageUp:
                if ( this.hasHorizontalScroll && !this.hasVerticalScroll ) {
                    newX += snap ? 1 : this.wrapperWidth;
                } else {
                    newY += snap ? 1 : this.wrapperHeight;
                }
                break;
            case this.options.keyBindings.pageDown:
                if ( this.hasHorizontalScroll && !this.hasVerticalScroll ) {
                    newX -= snap ? 1 : this.wrapperWidth;
                } else {
                    newY -= snap ? 1 : this.wrapperHeight;
                }
                break;
            case this.options.keyBindings.end:
                newX = snap ? this.pages.length-1 : this.maxScrollX;
                newY = snap ? this.pages[0].length-1 : this.maxScrollY;
                break;
            case this.options.keyBindings.home:
                newX = 0;
                newY = 0;
                break;
            case this.options.keyBindings.left:
                newX += snap ? -1 : 5 + this.keyAcceleration>>0;
                break;
            case this.options.keyBindings.up:
                newY += snap ? 1 : 5 + this.keyAcceleration>>0;
                break;
            case this.options.keyBindings.right:
                newX -= snap ? -1 : 5 + this.keyAcceleration>>0;
                break;
            case this.options.keyBindings.down:
                newY -= snap ? 1 : 5 + this.keyAcceleration>>0;
                break;
            default:
                return;
        }

        if ( snap ) {
            this.goToPage(newX, newY);
            return;
        }

        if ( newX > 0 ) {
            newX = 0;
            this.keyAcceleration = 0;
        } else if ( newX < this.maxScrollX ) {
            newX = this.maxScrollX;
            this.keyAcceleration = 0;
        }

        if ( newY > 0 ) {
            newY = 0;
            this.keyAcceleration = 0;
        } else if ( newY < this.maxScrollY ) {
            newY = this.maxScrollY;
            this.keyAcceleration = 0;
        }

        this.scrollTo(newX, newY, 0);

        this.keyTime = now;
    },

    _animate: function (destX, destY, duration, easingFn) {
        var that = this,
            startX = this.x,
            startY = this.y,
            startTime = utils.getTime(),
            destTime = startTime + duration;

        function step () {
            var now = utils.getTime(),
                newX, newY,
                easing;

            if ( now >= destTime ) {
                that.isAnimating = false;
                that._translate(destX, destY);

                if ( !that.resetPosition(that.options.bounceTime) ) {
                    that._execEvent('scrollEnd');
                }

                return;
            }

            now = ( now - startTime ) / duration;
            easing = easingFn(now);
            newX = ( destX - startX ) * easing + startX;
            newY = ( destY - startY ) * easing + startY;
            that._translate(newX, newY);

            if ( that.isAnimating ) {
                rAF(step);
            }
        }

        this.isAnimating = true;
        step();
    },
    handleEvent: function (e) {
        switch ( e.type ) {
            case 'touchstart':
            case 'pointerdown':
            case 'MSPointerDown':
            case 'mousedown':
                this._start(e);
                break;
            case 'touchmove':
            case 'pointermove':
            case 'MSPointerMove':
            case 'mousemove':
                this._move(e);
                break;
            case 'touchend':
            case 'pointerup':
            case 'MSPointerUp':
            case 'mouseup':
            case 'touchcancel':
            case 'pointercancel':
            case 'MSPointerCancel':
            case 'mousecancel':
                this._end(e);
                break;
            case 'orientationchange':
            case 'resize':
                this._resize();
                break;
            case 'transitionend':
            case 'webkitTransitionEnd':
            case 'oTransitionEnd':
            case 'MSTransitionEnd':
                this._transitionEnd(e);
                break;
            case 'wheel':
            case 'DOMMouseScroll':
            case 'mousewheel':
                this._wheel(e);
                break;
            case 'keydown':
                this._key(e);
                break;
            case 'click':
                if ( !e._constructed ) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                break;
        }
    }
};
function createDefaultScrollbar (direction, interactive, type) {
    var scrollbar = document.createElement('div'),
        indicator = document.createElement('div');

    if ( type === true ) {
        scrollbar.style.cssText = 'position:absolute;z-index:9999';
        indicator.style.cssText = '-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.9);border-radius:3px';
    }

    indicator.className = 'iScrollIndicator';

    if ( direction == 'h' ) {
        if ( type === true ) {
            scrollbar.style.cssText += ';height:7px;left:2px;right:2px;bottom:0';
            indicator.style.height = '100%';
        }
        scrollbar.className = 'iScrollHorizontalScrollbar';
    } else {
        if ( type === true ) {
            scrollbar.style.cssText += ';width:7px;bottom:2px;top:2px;right:1px';
            indicator.style.width = '100%';
        }
        scrollbar.className = 'iScrollVerticalScrollbar';
    }

    scrollbar.style.cssText += ';overflow:hidden';

    if ( !interactive ) {
        scrollbar.style.pointerEvents = 'none';
    }

    scrollbar.appendChild(indicator);

    return scrollbar;
}

function Indicator (scroller, options) {
    this.wrapper = typeof options.el == 'string' ? document.querySelector(options.el) : options.el;
    this.wrapperStyle = this.wrapper.style;
    this.indicator = this.wrapper.children[0];
    this.indicatorStyle = this.indicator.style;
    this.scroller = scroller;

    this.options = {
        listenX: true,
        listenY: true,
        interactive: false,
        resize: true,
        defaultScrollbars: false,
        shrink: false,
        fade: false,
        speedRatioX: 0,
        speedRatioY: 0
    };

    for ( var i in options ) {
        this.options[i] = options[i];
    }

    this.sizeRatioX = 1;
    this.sizeRatioY = 1;
    this.maxPosX = 0;
    this.maxPosY = 0;

    if ( this.options.interactive ) {
        if ( !this.options.disableTouch ) {
            utils.addEvent(this.indicator, 'touchstart', this);
            utils.addEvent(window, 'touchend', this);
        }
        if ( !this.options.disablePointer ) {
            utils.addEvent(this.indicator, utils.prefixPointerEvent('pointerdown'), this);
            utils.addEvent(window, utils.prefixPointerEvent('pointerup'), this);
        }
        if ( !this.options.disableMouse ) {
            utils.addEvent(this.indicator, 'mousedown', this);
            utils.addEvent(window, 'mouseup', this);
        }
    }

    if ( this.options.fade ) {
        this.wrapperStyle[utils.style.transform] = this.scroller.translateZ;
        this.wrapperStyle[utils.style.transitionDuration] = utils.isBadAndroid ? '0.001s' : '0ms';
        this.wrapperStyle.opacity = '0';
    }
}

Indicator.prototype = {
    handleEvent: function (e) {
        switch ( e.type ) {
            case 'touchstart':
            case 'pointerdown':
            case 'MSPointerDown':
            case 'mousedown':
                this._start(e);
                break;
            case 'touchmove':
            case 'pointermove':
            case 'MSPointerMove':
            case 'mousemove':
                this._move(e);
                break;
            case 'touchend':
            case 'pointerup':
            case 'MSPointerUp':
            case 'mouseup':
            case 'touchcancel':
            case 'pointercancel':
            case 'MSPointerCancel':
            case 'mousecancel':
                this._end(e);
                break;
        }
    },

    destroy: function () {
        if ( this.options.interactive ) {
            utils.removeEvent(this.indicator, 'touchstart', this);
            utils.removeEvent(this.indicator, utils.prefixPointerEvent('pointerdown'), this);
            utils.removeEvent(this.indicator, 'mousedown', this);

            utils.removeEvent(window, 'touchmove', this);
            utils.removeEvent(window, utils.prefixPointerEvent('pointermove'), this);
            utils.removeEvent(window, 'mousemove', this);

            utils.removeEvent(window, 'touchend', this);
            utils.removeEvent(window, utils.prefixPointerEvent('pointerup'), this);
            utils.removeEvent(window, 'mouseup', this);
        }

        if ( this.options.defaultScrollbars ) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
    },

    _start: function (e) {
        var point = e.touches ? e.touches[0] : e;

        e.preventDefault();
        e.stopPropagation();

        this.transitionTime();

        this.initiated = true;
        this.moved = false;
        this.lastPointX = point.pageX;
        this.lastPointY = point.pageY;

        this.startTime  = utils.getTime();

        if ( !this.options.disableTouch ) {
            utils.addEvent(window, 'touchmove', this);
        }
        if ( !this.options.disablePointer ) {
            utils.addEvent(window, utils.prefixPointerEvent('pointermove'), this);
        }
        if ( !this.options.disableMouse ) {
            utils.addEvent(window, 'mousemove', this);
        }

        this.scroller._execEvent('beforeScrollStart');
    },

    _move: function (e) {
        var point = e.touches ? e.touches[0] : e,
            deltaX, deltaY,
            newX, newY,
            timestamp = utils.getTime();

        if ( !this.moved ) {
            this.scroller._execEvent('scrollStart');
        }

        this.moved = true;

        deltaX = point.pageX - this.lastPointX;
        this.lastPointX = point.pageX;

        deltaY = point.pageY - this.lastPointY;
        this.lastPointY = point.pageY;

        newX = this.x + deltaX;
        newY = this.y + deltaY;

        this._pos(newX, newY);

// INSERT POINT: indicator._move

        e.preventDefault();
        e.stopPropagation();
    },

    _end: function (e) {
        if ( !this.initiated ) {
            return;
        }

        this.initiated = false;

        e.preventDefault();
        e.stopPropagation();

        utils.removeEvent(window, 'touchmove', this);
        utils.removeEvent(window, utils.prefixPointerEvent('pointermove'), this);
        utils.removeEvent(window, 'mousemove', this);

        if ( this.scroller.options.snap ) {
            var snap = this.scroller._nearestSnap(this.scroller.x, this.scroller.y);

            var time = this.options.snapSpeed || Math.max(
                    Math.max(
                        Math.min(Math.abs(this.scroller.x - snap.x), 1000),
                        Math.min(Math.abs(this.scroller.y - snap.y), 1000)
                    ), 300);

            if ( this.scroller.x != snap.x || this.scroller.y != snap.y ) {
                this.scroller.directionX = 0;
                this.scroller.directionY = 0;
                this.scroller.currentPage = snap;
                this.scroller.scrollTo(snap.x, snap.y, time, this.scroller.options.bounceEasing);
            }
        }

        if ( this.moved ) {
            this.scroller._execEvent('scrollEnd');
        }
    },

    transitionTime: function (time) {
        time = time || 0;
        this.indicatorStyle[utils.style.transitionDuration] = time + 'ms';

        if ( !time && utils.isBadAndroid ) {
            this.indicatorStyle[utils.style.transitionDuration] = '0.001s';
        }
    },

    transitionTimingFunction: function (easing) {
        this.indicatorStyle[utils.style.transitionTimingFunction] = easing;
    },

    refresh: function () {
        this.transitionTime();

        if ( this.options.listenX && !this.options.listenY ) {
            this.indicatorStyle.display = this.scroller.hasHorizontalScroll ? 'block' : 'none';
        } else if ( this.options.listenY && !this.options.listenX ) {
            this.indicatorStyle.display = this.scroller.hasVerticalScroll ? 'block' : 'none';
        } else {
            this.indicatorStyle.display = this.scroller.hasHorizontalScroll || this.scroller.hasVerticalScroll ? 'block' : 'none';
        }

        if ( this.scroller.hasHorizontalScroll && this.scroller.hasVerticalScroll ) {
            utils.addClass(this.wrapper, 'iScrollBothScrollbars');
            utils.removeClass(this.wrapper, 'iScrollLoneScrollbar');

            if ( this.options.defaultScrollbars && this.options.customStyle ) {
                if ( this.options.listenX ) {
                    this.wrapper.style.right = '8px';
                } else {
                    this.wrapper.style.bottom = '8px';
                }
            }
        } else {
            utils.removeClass(this.wrapper, 'iScrollBothScrollbars');
            utils.addClass(this.wrapper, 'iScrollLoneScrollbar');

            if ( this.options.defaultScrollbars && this.options.customStyle ) {
                if ( this.options.listenX ) {
                    this.wrapper.style.right = '2px';
                } else {
                    this.wrapper.style.bottom = '2px';
                }
            }
        }

        var r = this.wrapper.offsetHeight;  // force refresh

        if ( this.options.listenX ) {
            this.wrapperWidth = this.wrapper.clientWidth;
            if ( this.options.resize ) {
                this.indicatorWidth = Math.max(Math.round(this.wrapperWidth * this.wrapperWidth / (this.scroller.scrollerWidth || this.wrapperWidth || 1)), 8);
                this.indicatorStyle.width = this.indicatorWidth + 'px';
            } else {
                this.indicatorWidth = this.indicator.clientWidth;
            }

            this.maxPosX = this.wrapperWidth - this.indicatorWidth;

            if ( this.options.shrink == 'clip' ) {
                this.minBoundaryX = -this.indicatorWidth + 8;
                this.maxBoundaryX = this.wrapperWidth - 8;
            } else {
                this.minBoundaryX = 0;
                this.maxBoundaryX = this.maxPosX;
            }

            this.sizeRatioX = this.options.speedRatioX || (this.scroller.maxScrollX && (this.maxPosX / this.scroller.maxScrollX));  
        }

        if ( this.options.listenY ) {
            this.wrapperHeight = this.wrapper.clientHeight;
            if ( this.options.resize ) {
                this.indicatorHeight = Math.max(Math.round(this.wrapperHeight * this.wrapperHeight / (this.scroller.scrollerHeight || this.wrapperHeight || 1)), 8);
                this.indicatorStyle.height = this.indicatorHeight + 'px';
            } else {
                this.indicatorHeight = this.indicator.clientHeight;
            }

            this.maxPosY = this.wrapperHeight - this.indicatorHeight;

            if ( this.options.shrink == 'clip' ) {
                this.minBoundaryY = -this.indicatorHeight + 8;
                this.maxBoundaryY = this.wrapperHeight - 8;
            } else {
                this.minBoundaryY = 0;
                this.maxBoundaryY = this.maxPosY;
            }

            this.maxPosY = this.wrapperHeight - this.indicatorHeight;
            this.sizeRatioY = this.options.speedRatioY || (this.scroller.maxScrollY && (this.maxPosY / this.scroller.maxScrollY));
        }

        this.updatePosition();
    },

    updatePosition: function () {
        var x = this.options.listenX && Math.round(this.sizeRatioX * this.scroller.x) || 0,
            y = this.options.listenY && Math.round(this.sizeRatioY * this.scroller.y) || 0;

        if ( !this.options.ignoreBoundaries ) {
            if ( x < this.minBoundaryX ) {
                if ( this.options.shrink == 'scale' ) {
                    this.width = Math.max(this.indicatorWidth + x, 8);
                    this.indicatorStyle.width = this.width + 'px';
                }
                x = this.minBoundaryX;
            } else if ( x > this.maxBoundaryX ) {
                if ( this.options.shrink == 'scale' ) {
                    this.width = Math.max(this.indicatorWidth - (x - this.maxPosX), 8);
                    this.indicatorStyle.width = this.width + 'px';
                    x = this.maxPosX + this.indicatorWidth - this.width;
                } else {
                    x = this.maxBoundaryX;
                }
            } else if ( this.options.shrink == 'scale' && this.width != this.indicatorWidth ) {
                this.width = this.indicatorWidth;
                this.indicatorStyle.width = this.width + 'px';
            }

            if ( y < this.minBoundaryY ) {
                if ( this.options.shrink == 'scale' ) {
                    this.height = Math.max(this.indicatorHeight + y * 3, 8);
                    this.indicatorStyle.height = this.height + 'px';
                }
                y = this.minBoundaryY;
            } else if ( y > this.maxBoundaryY ) {
                if ( this.options.shrink == 'scale' ) {
                    this.height = Math.max(this.indicatorHeight - (y - this.maxPosY) * 3, 8);
                    this.indicatorStyle.height = this.height + 'px';
                    y = this.maxPosY + this.indicatorHeight - this.height;
                } else {
                    y = this.maxBoundaryY;
                }
            } else if ( this.options.shrink == 'scale' && this.height != this.indicatorHeight ) {
                this.height = this.indicatorHeight;
                this.indicatorStyle.height = this.height + 'px';
            }
        }

        this.x = x;
        this.y = y;

        if ( this.scroller.options.useTransform ) {
            this.indicatorStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.scroller.translateZ;
        } else {
            this.indicatorStyle.left = x + 'px';
            this.indicatorStyle.top = y + 'px';
        }
    },

    _pos: function (x, y) {
        if ( x < 0 ) {
            x = 0;
        } else if ( x > this.maxPosX ) {
            x = this.maxPosX;
        }

        if ( y < 0 ) {
            y = 0;
        } else if ( y > this.maxPosY ) {
            y = this.maxPosY;
        }

        x = this.options.listenX ? Math.round(x / this.sizeRatioX) : this.scroller.x;
        y = this.options.listenY ? Math.round(y / this.sizeRatioY) : this.scroller.y;

        this.scroller.scrollTo(x, y);
    },

    fade: function (val, hold) {
        if ( hold && !this.visible ) {
            return;
        }

        clearTimeout(this.fadeTimeout);
        this.fadeTimeout = null;

        var time = val ? 250 : 500,
            delay = val ? 0 : 300;

        val = val ? '1' : '0';

        this.wrapperStyle[utils.style.transitionDuration] = time + 'ms';

        this.fadeTimeout = setTimeout((function (val) {
            this.wrapperStyle.opacity = val;
            this.visible = +val;
        }).bind(this, val), delay);
    }
};

IScroll.utils = utils;

if ( typeof module != 'undefined' && module.exports ) {
    module.exports = IScroll;
} else {
    window.IScroll = IScroll;
}

})(window, document, Math);
//iscroll end 


//html parser
(function() {
    
  var supports = (function() {
    var supports = {};

    var html, expected;
    var work = document.createElement('div');

    html = "<P><I></P></I>";
    work.innerHTML = html;
    supports.tagSoup = work.innerHTML !== html;

    work.innerHTML = "<P><i><P></P></i></P>";
    supports.selfClose = work.childNodes.length === 2;

    return supports;
  })();



  // Regular Expressions for parsing tags and attributes
  var startTag = /^<([\-A-Za-z0-9_]+)((?:\s+[\w-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
  var endTag = /^<\/([\-A-Za-z0-9_]+)[^>]*>/;
  var attr = /([\-A-Za-z0-9_]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;
  var fillAttr = /^(checked|compact|declare|defer|disabled|ismap|multiple|nohref|noresize|noshade|nowrap|readonly|selected)$/i;

  var DEBUG = false;

  function htmlParser(stream, options) {
    stream = stream || '';

    // Options
    options = options || {};

    for(var key in supports) {
      if(options.autoFix) {
        options['fix_'+key] = true;//!supports[key];
      }
      options.fix = options.fix || options['fix_'+key];
    }

    var stack = [];

    var append = function(str) {
      stream += str;
    };

    var prepend = function(str) {
      stream = str + stream;
    };

    // Order of detection matters: detection of one can only
    // succeed if detection of previous didn't
    var detect = {
      comment: /^<!--/,
      endTag: /^<\//,
      atomicTag: /^<\s*(script|style|noscript)[\s>]/i,
      startTag: /^</,
      chars: /^[^<]/
    };

    // Detection has already happened when a reader is called.
    var reader = {

      comment: function() {
        var index = stream.indexOf("-->");
        if ( index >= 0 ) {
          return {
            content: stream.substr(4, index),
            length: index + 3
          };
        }
      },

      endTag: function() {
        var match = stream.match( endTag );

        if ( match ) {
          return {
            tagName: match[1],
            length: match[0].length
          };
        }
      },

      atomicTag: function() {
        var start = reader.startTag();
        if(start) {
          var rest = stream.slice(start.length);
          var match = rest.match("([\\s\\S]*?)<\/" + start.tagName + "[^>]*>");
          if(match) {
            // good to go
            return {
              tagName: start.tagName,
              attrs: start.attrs,
              escapedAttrs: start.escapedAttrs,
              content: match[1],
              length: match[0].length + start.length
            }
          }
        }
      },

      startTag: function() {
        var match = stream.match( startTag );

        if ( match ) {
          var attrs = {};
          var escapedAttrs = {};

          match[2].replace(attr, function(match, name) {
            var value = arguments[2] || arguments[3] || arguments[4] ||
              fillAttr.test(name) && name || null;

            attrs[name] = value;
            // escape double-quotes for writing html as a string
            escapedAttrs[name] = value && value.replace(/(^|[^\\])"/g, '$1\\\"');
          });

          return {
            tagName: match[1],
            attrs: attrs,
            escapedAttrs: escapedAttrs,
            unary: match[3],
            length: match[0].length
          }
        }
      },

      chars: function() {
        var index = stream.indexOf("<");
        return {
          length: index >= 0 ? index : stream.length
        };
      }
    };

    var readToken = function() {

      // Enumerate detects in order
      for (var type in detect) {

        if(detect[type].test(stream)) {
          DEBUG && console.log('suspected ' + type);

          var token = reader[type]();
          if(token) {
            DEBUG && console.log('parsed ' + type, token);
            // Type
            token.type = token.type || type;
            // Entire text
            token.text = stream.substr(0, token.length);
            // Update the stream
            stream = stream.slice(token.length);

            return token;
          }
          return null;
        }
      }
    };

    var readTokens = function(handlers) {
      var tok;
      while(tok = readToken()) {
        // continue until we get an explicit "false" return
        if(handlers[tok.type] && handlers[tok.type](tok) === false) {
          return;
        }
      }
    };

    var clear = function() {
      stream = '';
    };

    var rest = function() {
      return stream;
    };

    if(options.fix) {
      (function() {
        // Empty Elements - HTML 4.01
        var EMPTY = /^(AREA|BASE|BASEFONT|BR|COL|FRAME|HR|IMG|INPUT|ISINDEX|LINK|META|PARAM|EMBED)$/i;

        // Block Elements - HTML 4.01
        var BLOCK = /^(ADDRESS|APPLET|BLOCKQUOTE|BUTTON|CENTER|DD|DEL|DIR|DIV|DL|DT|FIELDSET|FORM|FRAMESET|HR|IFRAME|INS|ISINDEX|LI|MAP|MENU|NOFRAMES|NOSCRIPT|OBJECT|OL|P|PRE|SCRIPT|TABLE|TBODY|TD|TFOOT|TH|THEAD|TR|UL)$/i;

        // Inline Elements - HTML 4.01
        var INLINE = /^(A|ABBR|ACRONYM|APPLET|B|BASEFONT|BDO|BIG|BR|BUTTON|CITE|CODE|DEL|DFN|EM|FONT|I|IFRAME|IMG|INPUT|INS|KBD|LABEL|MAP|OBJECT|Q|S|SAMP|SCRIPT|SELECT|SMALL|SPAN|STRIKE|STRONG|SUB|SUP|TEXTAREA|TT|U|VAR)$/i;

        // Elements that you can| intentionally| leave open
        // (and which close themselves)
        var CLOSESELF = /^(COLGROUP|DD|DT|LI|OPTIONS|P|TD|TFOOT|TH|THEAD|TR)$/i;


        var stack = [];
        stack.last = function() {
          return this[this.length - 1];
        };
        stack.lastTagNameEq = function(tagName) {
          var last = this.last();
          return last && last.tagName &&
            last.tagName.toUpperCase() === tagName.toUpperCase();
        };

        stack.containsTagName = function(tagName) {
          for(var i = 0, tok; tok = this[i]; i++) {
            if(tok.tagName === tagName) {
              return true;
            }
          }
          return false;
        };

        var correct = function(tok) {
          if(tok && tok.type === 'startTag') {
            // unary
            tok.unary = EMPTY.test(tok.tagName) || tok.unary;
          }
          return tok;
        };

        var readTokenImpl = readToken;

        var peekToken = function() {
          var tmp = stream;
          var tok = correct(readTokenImpl());
          stream = tmp;
          return tok;
        };

        var closeLast = function() {
          var tok = stack.pop();

          // prepend close tag to stream.
          prepend('</'+tok.tagName+'>');
        };

        var handlers = {
          startTag: function(tok) {
            var tagName = tok.tagName;
            // Fix tbody
            if(tagName.toUpperCase() === 'TR' && stack.lastTagNameEq('TABLE')) {
              prepend('<TBODY>');
              prepareNextToken();
            } else if(options.fix_selfClose &&
              CLOSESELF.test(tagName) &&
              stack.containsTagName(tagName)) {
                if(stack.lastTagNameEq(tagName)) {
                  closeLast();
                } else {
                  prepend('</'+tok.tagName+'>');
                  prepareNextToken();
                }
            } else if (!tok.unary) {
              stack.push(tok);
            }
          },

          endTag: function(tok) {
            var last = stack.last();
            if(last) {
              if(options.fix_tagSoup && !stack.lastTagNameEq(tok.tagName)) {
                // cleanup tag soup
                closeLast();
              } else {
                stack.pop();
              }
            } else if (options.fix_tagSoup) {
              // cleanup tag soup part 2: skip this token
              skipToken();
            }
          }
        };

        var skipToken = function() {
          // shift the next token
          readTokenImpl();

          prepareNextToken();
        };

        var prepareNextToken = function() {
          var tok = peekToken();
          if(tok && handlers[tok.type]) {
            handlers[tok.type](tok);
          }
        };

        // redefine readToken
        readToken = function() {
          prepareNextToken();
          return correct(readTokenImpl());
        };
      })();
    }

    return {
      append: append,
      readToken: readToken,
      readTokens: readTokens,
      clear: clear,
      rest: rest,
      stack: stack
    };

  };

  htmlParser.supports = supports;

  htmlParser.tokenToString = function(tok) {
    var handler = {
      comment: function(tok) {
        return '<--' + tok.content + '-->';
      },
      endTag: function(tok) {
        return '</'+tok.tagName+'>';
      },
      atomicTag: function(tok) {
        console.log(tok);
        return handler.startTag(tok) +
              tok.content +
              handler.endTag(tok);
      },
      startTag: function(tok) {
        var str = '<'+tok.tagName;
        for (var key in tok.attrs) {
          var val = tok.attrs[key];
          // escape quotes
          str += ' '+key+'="'+(val ? val.replace(/(^|[^\\])"/g, '$1\\\"') : '')+'"';
        }
        return str + (tok.unary ? '/>' : '>');
      },
      chars: function(tok) {
        return tok.text;
      }
    };
    return handler[tok.type](tok);
  };

    for(var key in supports) {
        htmlParser.browserHasFlaw = htmlParser.browserHasFlaw || (!supports[key]) && key;
    }

    this.htmlParser = htmlParser;
})();

//htmlparser end


/**
 * @author Administrator
 *	ver:0.1
 * main function
 * 
 */
(function(){
    
    var isWebApp = function(){
        var iswa = location.href.indexOf('http') > -1;
        return function(){
            return iswa;
        }
    }();
    
    var isWeiXin = function(){
        return navigator.userAgent.match(/micromessenger/i);
    };
    
    var configWeiXin = function(url,callback){
        if(!isWeiXin()){
            return;
        }
        callback = callback || function(){};
        var getConfig = function(success){
            var xhr = new XMLHttpRequest();
            url = url || 'http://weixin.appcan.cn/8082/wechat_api/jsapi/jsconfig?debug=false&url='+location.href.split('#')[0];
            xhr.open('GET',url,true);
            xhr.onreadystatechange = function(){
                if (xhr.readyState == 4){
                    if (xhr.status == 200){
                        try{
                            success(JSON.parse(xhr.response));
                        }catch(e){
                            success({});
                        }
                    }else{
                        callback(null);
                    }
                }else{
                    console.log('load weixin config error');
                    callback(null);
                }
            };
            xhr.send(null);
        };
        var wxjsSdk = 'http://res.wx.qq.com/open/js/jweixin-1.0.0.js';
        loadjs(wxjsSdk,function(){
            getConfig(function(config){
                wx.config(config.res);
                alert('config 111 success!');
                callback(config);
            });
        },function(){
            callback(null);
            console.log('load weixin jssdk error');
        });
    };
    
    window.setWeiXinConfig = configWeiXin;
    
    //获取浏览器内核信息
    var browser={
        versions:function(){            
        var u = navigator.userAgent, app = navigator.appVersion;            
            return {                
                trident: u.indexOf('Trident') > -1, //IE内核                
                presto: u.indexOf('Presto') > -1, //opera内核                
                webKit: u.indexOf('AppleWebKit') > -1, //苹果、谷歌内核                
                gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1, //火狐内核                
                mobile: !!u.match(/AppleWebKit.*Mobile.*/)||!!u.match(/AppleWebKit/), //是否为移动终端                
                ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //ios终端                
                android: u.indexOf('Android') > -1 || u.indexOf('Linux') > -1, //android终端或者uc浏览器                
                iPhone: u.indexOf('iPhone') > -1 || u.indexOf('Mac') > -1, //是否为iPhone或者QQHD浏览器                
                iPad: u.indexOf('iPad') > -1, //是否iPad                
                webApp: u.indexOf('Safari') == -1 //是否web应该程序，没有头部与底部            
            };
        }()
    };
    
    
    //设置默认字体
    //window.localStorage.setItem('defaultfontsize','32px')

    var gujsonPid = 1; //定义一个全局的guid
    
    function ajaxCrossDomain(url,cb){
        var c = 'jsonp' + (++gujsonPid);                            //使用guid生成一个临时的函数名称  例如  jsonp1 jsonp2 jsonp3，每次调用这个函数都会不同
        var script = document.createElement('script');      //创建一个script标签
        window[c] = function(a) {                          //把funciton(a)赋值给 windows[c]对象
                 cb(a);
                 delete window[c];
        };
        script.src = url.replace(/\?/, '?json=' + c+"&");      //在url中把函数名称加入。例如原来是 www.baidu.com?a=b 变为  www.baidu.com?jsonp1&a=b
        document.getElementsByTagName("head")[0].appendChild(script)    // 把新生成的url加入到script中去，并插入到网页中。
    } 

    /*
            这个没有用到
    
    //判断浏览器类型，区别是否使用input（date型控件）
    function isInputDateOk(){
        var obj = window.navigator;
        var plat = obj.platform;
        var userAgent = obj.userAgent;
        
        if(userAgent.indexOf("Mozilla/5.0") >= 0 && userAgent.indexOf("Android 4.1.2") >= 0){
            return true;
        }else{
            return false;
        }
    }
    
    var isInputDate = isInputDateOk();

    //是否为日期格式
    function isDate(date){
        if(date.split("-").length != 3){
            return false;
        }
        
        var dd = new Date(date);
        if(dd == "Invalid Date"){
            return false;
        }else{
            return true;
        }
    }
    */
   
    //获取唯一id
    var getUID = function(){
        var baseId = 0;
        return function(prefix){
            prefix = prefix || '';
            prefix = location.href + '-' + prefix;
            return prefix+baseId++;
        };
    }();
    
    /* From Modernizr */  
    function whichTransitionEvent(){
        var t;  
        var el = document.createElement('fakeelement');  
        var transitions = {
            'OTransition':'oTransitionEnd',  
            'WebkitTransition':'webkitTransitionEnd', 
            'MozTransition':'transitionend',  
            'MsTransition':'msTransitionEnd',
            'transition':'transitionend'  
        };
        
        for(t in transitions){  
            if( el.style[t] !== undefined ){  
                return transitions[t];  
            }  
        }  
    }  
    
    //获取绝对路径
    function realPath(path){
        var DOT_RE = /\/\.\//g;
        var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//;
        var MULTI_SLASH_RE = /([^:/])\/+\//g;
        // /a/b/./c/./d ==> /a/b/c/d
        path = path.replace(DOT_RE, "/");
        /*
            @author wh1100717
            a//b/c ==> a/b/c
            a///b/////c ==> a/b/c
            DOUBLE_DOT_RE matches a/b/c//../d path correctly only if replace // with / first
        */
        path = path.replace(MULTI_SLASH_RE, "$1/");
        // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
        while (path.match(DOUBLE_DOT_RE)) {
            path = path.replace(DOUBLE_DOT_RE, "/");
        }
        return path;
    }
    
    function pathJoin(url,joinUrl){
        if(joinUrl.indexOf('http:') > -1){
            return joinUrl;
        }
        if(joinUrl.indexOf('//') == 0){
            return location.href.split('//')[0] + joinUrl;
        }
        if(url[url.length-1] != '/'){
            url = url.substr(0,url.lastIndexOf('/')+1);
        }
        var newUrl = url + joinUrl;
        return realPath(newUrl);
    }
    
    function descEach(ary,it){
        if(!ary || !it){
            return;
        }
        for(var i=ary.length-1; i >= 0;i--){
            if(it(i,ary[i]) === false){
                return;
            }
        }
    }
    
    
    
    
    //pure js dom parser and filter
    function getRealContent(resList,url,success){
        var $ = Zepto;
        var distUrl = pathJoin(location.href,url);
        
        $.ajax({
            url:distUrl,
            dataType:'html',
            cache:false,
            success:function(data){
                //alert(window.DOMParser);
                //var dp = new DOMParser();
                //var dom = dp.parseFromString(data,'text/html');
                //remove datatype
                
                data = data.replace(/<!\s*doctype[^>]+>/i,'');
                var hp = htmlParser(data,{fix:true});
                
                
                var resource = {
                    styleList:[],
                    scriptList:[],
                    linkList:[]
                };
                
                var tokenState = 0;//0:无状态。1:标签开始。2:内容。3:结束
                var tokenText = [];
                var token;
                var resData = '';
                var bodyData = '';
                var isInHeader = false;
                
                while(token = hp.readToken()){
                    if(token.type === 'atomicTag'){
                        if(token.tagName === 'script'){
                            var src = token.attrs.src;
                            if(src){
                                src = pathJoin(location.href,src);
                                if(src && (src in resList)){
                                    
                                }else{
                                    resData += token.text;
                                    resource.scriptList.push(token);
                                }
                            }else{
                                resData += token.text;
                                resource.scriptList.push(token);
                            }
                        }else if(token.tagName === 'style'){
                            
                            if(isInHeader){
                                resource.styleList.push(token);
                            }
                            
                            if(tokenState === 1){
                                bodyData += token.text;
                            }
                            
                        }else{
                            resData += token.text;
                            if(tokenState === 1){
                                bodyData += token.text;
                            }
                        }
                        continue;
                    }
                    
                    if(token.type === 'startTag'){
                        if(tokenState === 1){
                            bodyData += token.text;
                        }
                        if(token.unary === true){
                            if(token.tagName !== 'link'){
                                resData += token.text;
                            }else{
                                //
                                var href = pathJoin(location.href,token.attrs.href);
                                if(href && (href in resList)){
                                    
                                }else{
                                   resource.linkList.push(token); 
                                }
                            }
                        }
                        if(token.tagName === 'head'){
                            isInHeader = true;
                        }
                        if(token.tagName === 'body'){
                            bodyData += token.text;
                            tokenState = 1;
                        }
                        resData += token.text;
                        continue;
                    }
                    
                    if(token.type === 'endTag'){
                        if(tokenState === 1){
                            bodyData += token.text;
                        }
                        if(token.tagName === 'head'){
                            isInHeader = false;
                        }
                        if(token.tagName === 'body'){
                            tokenState = 0;
                        }
                        resData += token.text;
                        continue;
                    }
                    resData += token.text;
                    bodyData += token.text;
                }
                
                //显示数据
                success.call(null,bodyData,resource);
            }
        });
        
    }
    
    
    function loadjs(src, success, error) {
        var node = document.createElement('script');
        var head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
        node.src = src;
        
        if ('onload' in node) {
            node.onload = success;
            node.onerror = error;
        } else {
            node.onreadystatechange = function() {
                if (/loaded|complete/.test(node.readyState)) {
                    success();
                }
            }
        }
        
        head.appendChild(node);
    }
    
    //像素转em
    function px2em(px){
        var basePx = window.getComputedStyle(document.body,'');
        var fontSize = parseInt(basePx.fontSize,10);
        px = parseInt(px);
        return px/fontSize;
    }
    
    //隐藏其他节点
    function hideOtherPopover(name){
        if(!name){
            return;
        }
        var winStack = window.top.appcan_winStack;
        var hash = window.top.appcan_hash;
        var last = winStack[winStack.length - 1];
        
        var idx = uexWindow.findWin(last.popOver, name,1);
        
        for(var i=0,len = last.popOver.length; i<len; i++){
            if(last.popOver[i].attr("id").split('.pop_')[1] != name){
                Zepto(last.popOver[i][0]).hide();
            }
        }
        
    }
    
    
    function loadjsSync(list,success,error){
        
        if(Object.prototype.toString.call(list) !== "[object Array]"){
            list = list[list];
        }
        
        var totalLoaded = 0;
        var errLoaded = 0;
        
        var curr = list.shift();
        

        //Dynamically evaluate JavaScript-as-string in the browser
        function addCode(js){
            var e = document.createElement('script');
            e.type = 'text/javascript';
            e.src  = 'data:text/javascript;charset=utf-8,'+escape(js);
            document.body.appendChild(e);
        }
        
        
        function next(){
            if(!curr){
                success();
                return;
            }
            
            if(curr.isplain){
                window.eval(curr.content+'//# sourceURL='+getUID('debug-script-')+'.js');
                //addCode(curr.content);
                curr = list.shift();
                next();
                return;
            }else{
                loadjs(curr.content,function(){
                    curr = list.shift();
                    next();
                },function(){
                    curr = list.shift();
                    next();
                });
            }
        };
        
        next();
    }
    
    
    /* 监听 transition! */  
    var transitionEvent = whichTransitionEvent(); 
    var isPhone = (window.navigator.platform != "Win32");
    var isAndroid = (browser.versions.android == true) ? true : false;
    
    /*
    Array.prototype.last = function(){
        if (this.length) 
            return this[this.length - 1];
        return null;
    }
    Array.prototype.first = function(){
        if (this.length) 
            return this[0];
        return null;
    }
    */
    
    var winStack = [];
    window.appcan_winStack = winStack;
    
    winStack.hide = function(pos){
        var item = eval("winStack." + pos + "();");
        if (item) {
            item.hide();
        }
    };
    
    winStack.show = function(pos){
        var item = eval("winStack." + pos + "();");
        if (item){
            item.show();
        }
    };
    
    function emptyFun(){}
    
    var hash = [];
    
    window.appcan_hash = hash;
    
    hash.find = function(name){
        for (var i = 0; i < hash.length; i++) {
            if (hash[i].inWindName==name) 
                return i;
        }
        return -1;
    };
    
    window.onhashchange = function(e){
        var uexWindow = window.top.uexWindow;
        var winStack = window.top.appcan_winStack;
        var hash = window.top.appcan_hash;
        //hash.last
        var cur = e.newURL;
        var curN = cur.split('#')[1];
        if (!curN) {
            uexWindow.cbClose();
            return;
        }
        var old = e.oldURL;
        if (old.indexOf('#') > 0) {
            oldN = old.split('#')[1];
        }
        else {
            var curIndex = hash.find(curN);
            uexWindow.cbOpen(hash[curIndex]);
            return;
        }
        var curIndex = hash.find(curN);
        var oldIndex = hash.find(oldN);
        var curWIndex = uexWindow.findWin(winStack, curN);
        var curState = true;
        
        for (var i = 0; i < hash.length; i++) {
            if (hash[i].inWindName == curN) {
                curState = hash[i].state;
            }
        }
        if (curIndex > oldIndex) {//前进
            if (!curState) {
                window.history.go(1);
                return;
            }
            uexWindow.cbOpen(hash[curIndex]);
        }
        else {//后退
            if (curWIndex > -1) {
                uexWindow.cbClose();
            }
            else {
                if (!curState) {
                    window.history.go(-1);
                    return;
                }
            }
        }
    };
    
    var uexWindow = {
        lock: false,
        lastPop:"",
        emptyFun: function(){
        },
        currZIndex:9000,
        findWin: function(winArray,id,pop){
            for (var i = 0; i < winArray.length; i++) {
                //  if (winArray[i].attr("id").indexOf(id)>=0) 
                if(pop){
                    if(winArray[i].attr("id").split('.pop_')[1] == id){
                        return i;
                    }
                }else{
                    if(winArray[i].attr("id")== ('wnd_'+id))
                    return i;
                }
            }
            return -1;
        },
        open: function(inWindName, inDataType, inData, inAniID, inWidth, inHeight, inFlag, inAnimDuration, firstEle){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            
            //
            //if(inWindName == topWindow.winN){
            //    return;
            //}
            
            if(uexWindow.lock){
                return;
            }
            uexWindow.lock = true;
            var json = {'inWindName':inWindName,'inDataType':inDataType, 'inData':inData,'inAniID':inAniID, 'inWidth':inWidth, 'inHeight':inHeight, 'inFlag':inFlag, 'inAnimDuration':inAnimDuration,'url':location.href,'state':1}
            //if(inWindName==inWindName){
                if (firstEle) {
                    //topWindow.location.hash = '';
                    uexWindow.cbOpen(json);
                    //hash.push(json);
                    return;
                }
            //}
            var isExist = false;
            for(var i=0;i<hash.length;i++){
                if(hash[i].inWindName == inWindName){
                    hash.splice(i,1);
                    //hash[i].state=1;
                    //isExist = true;
                }
            }
            hash.push(json);
            if (navigator.userAgent.indexOf("IE") > 0) {
            }else{
                topWindow.location.hash = '#'+inWindName;
            }
            topWindow.location.hash = '#'+inWindName;
            topWindow.winN = inWindName;
            
        },
        cbOpen:function(d){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            var page = $("<div id=wnd_" + d.inWindName + " class='up ub ub-ver uabs ub-con " + (d.inAniID ? "a-mr" : "") + " utra'></div>");
            var fp = "";
            if (navigator.userAgent.indexOf("IE") > 0) {
                fp = d.inData;
            }else{
                fp = d.inData+'#wnd_'+d.inWindName;
            }
            
            var win = document.createElement('iframe');
            
            win.src = d.inData;
            win.setAttribute('class','up ub ub-ver uabs ub-con');
            page[0].appendChild(win);
            page.popOver = [];
            
            try{
               window.top.$_$("#Container").append(page);
            }catch(e){
                uexWindow.lock = false;
                return;
            }
            
            uexWindow.lock = false;
            page.onStateChange = uexWindow.onStateChange ? uexWindow.onStateChange : uexWindow.emptyFun;
            uexWindow.onStateChange = null;
            
            //page.onKeyPressed = uexWindow.onKeyPressed ? uexWindow.onKeyPressed : uexWindow.emptyFun;
            //uexWindow.onKeyPressed = null;
            //page.uexOnload = window.uexOnload ? window.uexOnload : uexWindow.emptyFun;
            //window.uexOnload = null;
            
            var last = winStack[winStack.length - 1];
            winStack.push(page);
            
            if (last && last.onStateChange) {
                last.onStateChange(1);
            }
            
            setTimeout(function(){
                //监听 transition!
                transitionEvent = whichTransitionEvent(); 
                if (d.inAniID) {
                    zy_anim_listen(page[0], function(){
                        if (last){
                            last.hideclass();
                        }
                    });
                    page.removeClass("a-mr");
                }
                //page.uexOnload(1);
                
            }, 10);
            
        },
        setWindowFrame: function(inX, inY, inAnimDuration){
        },
        close: function(){
            var winStack = window.top.appcan_winStack;
            var hash = window.top.appcan_hash;
            
            if(winStack.length ==1){
                uexWindow.open("index", 0, "index.html", 1);
                return;
            }
            var cur = winStack[winStack.length - 1];
            var name = cur[0].id.split('_')[1];
            
            for(var i=0;i<hash.length;i++){
                if(hash[i].inWindName==name){
                    hash[i].state=0;
                }
            }
            window.history.go(-1);
            event.stopPropagation();
        },
        cbClose:function(){
            var winStack = window.top.appcan_winStack;
            var hash = window.top.appcan_hash;
            var uexWindow = window.top.uexWindow;
            
            var last = winStack.pop();
            var cur = winStack[winStack.length - 1];
            if (cur) {
                cur.showclass();
                
                if (cur.onStateChange) {
                    cur.onStateChange(0);
                }
                zy_anim_listen(last[0], function(){
                    last.remove();
                });
                last.addClass("a-mr");
                last.innerHTML = '';
                
                uexWindow.lock = false;
                $closeToast();
                try{
                    this.winN = cur.attr("id").split("_")[1];
                }catch(e){
                    
                }
                uexWindow.lastPop = "";
            }
        },
        closeByName:function(n,a){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            for(var i=0;i<hash.length;i++){
                if(hash[i].inWindName==n){
                    hash[i].state=0;
                }
            }
            var i = this.findWin(winStack,n);
            if(i>=0){
                winStack[i].remove();
                winStack.splice(i, 1);
                uexWindow.lastPop="";
            }
        },
        openPopover: function(inWindName, inDataType, inData, data, x, y, w, h, fontSize, bottomMargin){
            var winStack = window.top.appcan_winStack;
            var cur = winStack[winStack.length - 1];
            cur.res = cur.res || {};
            
            //更新当前win资源
            Zepto('script').each(function(i,v){
                var src = v.src;
                cur.res[src] = 'js';
            });
            
            Zepto('link').each(function(i,v){
                var href = v.href;
                cur.res[href] = 'css';
            });
            
            var uexWindow = window.top.uexWindow;
            
            if (!cur) {
                return;
            }
            var i = this.findWin(cur.popOver, inWindName,1);
            if (i >= 0) {
                return;
            }
            
            uexWindow.lastPop = inWindName;
            
            var popContainer = $("<div id='" + cur.attr("id") + ".pop_" + inWindName + "'class=' ub-con batou_zhy' style='overflow:hidden;'></div>")
            
            var str = "<div class='um-vp bc-bg ub-ver'></div>"
            
            var eleZIndex = this.currZIndex++;
            
            
            //序列化html数据
            getRealContent(cur.res,inData,function(htmlData,resource){
                var content = cur.find('iframe')[0].contentWindow.document.querySelector("#" + inWindName);
                
                if(!content){
                    //create new 
                    content = Zepto('<div></div>');
                    
                    content.css({
                        top:px2em(y)+'em',
                        left:px2em(x)+'em',
                        width:'100%',
                        height:px2em(h)+'em',
                        position:'absolute',
                        background:'#FFF',
                        zIndex:eleZIndex
                    });
                    
                    Zepto('body').append(content);
                    content = content[0];
                }else{
                    var css = Zepto(content).offset();
                    
                    if(inWindName !== 'content'){
                        
                        Zepto(popContainer[0]).css({
                            top:px2em(0)+'em',
                            left:px2em(0)+'em',
                            width:'100%',
                            height:px2em(css.height)+'em',
                            position:'absolute',
                            background:'#FFF',
                            zIndex:eleZIndex
                        });
                      
                    }
                    
                }
                
                var ppcnt = Zepto(str);
                
                Zepto.each(resource.linkList,function(i,v){
                    ppcnt.append(v.text);
                });
                Zepto.each(resource.styleList,function(i,v){
                    ppcnt.append(v.text);
                });
                
                //htmlData = htmlData.replace(/<[^<]*body[^>]*>/,'').replace(/<[^\/]*\/body[^>]*>/,'');
                
                ppcnt.append(htmlData);
                
                Zepto(popContainer[0]).html(ppcnt);
                
                content.appendChild(popContainer[0]);
                popContainer.container = content;
                
                var execList = [];
                
                Zepto.each(resource.scriptList,function(i,v){
                    if(v.attrs && v.attrs.src){
                        execList.push({
                            isSrc:true,
                            content:v.attrs.src
                        });
                    }else{
                        execList.push({
                            isplain:true,
                            content:(v.content)
                        });
                    }
                });
                
                loadjsSync(execList,function(){
                    //load resource 
                    popContainer.uexOnload = window.uexOnload ? window.uexOnload : uexWindow.emptyFun;
                    //window.uexOnload = null;
                    cur.popOver.push(popContainer);
                    
                    //添加iscroll
                    setTimeout(function(){
                        
                        popContainer.contentScroll = new IScroll(popContainer[0],{
                                zoom:true,
                                bounce:false,
                                preventDefault:true,
                                preventDefaultException:{tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/,className:/(^|\s)btn|not-btn(\s|$)/}
                        });
                        
                    },50);
                    
                    popContainer.uexOnload(1);
                    
                });
                
            });
            
        },
        closePopover: function(inPopName){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            uexWindow.lastPop = "";
            var cur = winStack[winStack.length - 1];
            if (!cur) {
                return;
            }
            var i = this.findWin(cur.popOver, inPopName,1);
            if(i >= 0){
                if(inPopName!= 'content'){
                    cur.popOver[i].container.remove();
                }else{
                    cur.popOver[i].remove();
                }

                cur.popOver.splice(i, 1);
            }
            
        },
        openMultiPopover: function(inContent, inPopName, inDataType, inX, inY, inWidth, inHeight, inFontSize, inFlag, inIndexSelected){
        },
        closeMultiPopover: function(inPopName){
        },
        setSelectedPopOverInMultiWindow: function(inPopName, indexPage){
        },
        setPopoverFrame: function(inPopName, inX, inY, inWidth, inHeight){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            var cur = winStack[winStack.length - 1];
            if (!cur){
                return;    
            }
            var i = this.findWin(cur.popOver, inPopName,1);
            if (i >= 0) {
                cur.popOver[i].css("left", inX + "px", "top", inY + "px");
            }
        },
        setBounce: function(v){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            var win = winStack[winStack.length - 1];
            var pop = win.popOver[win.popOver.length - 1];
            
            //开启弹动
            if (v != 0) {
                if (pop) {
                    setTimeout(function(){
                        pop.contentScroll && pop.contentScroll.destroy();
                        pop.contentScroll = null;
                        pop.contentScroll = new IScroll(pop[0],{
                                zoom:true,
                                bounce:false,
                                preventDefault:true,
                                preventDefaultException:{className:/(^|\s)btn(\s|$)/}
                        });
                    }, 60);
                }
            }else{
                if (pop) {
                    setTimeout(function(){
                        pop.contentScroll && pop.contentScroll.destroy();
                        pop.contentScroll = null;
                        pop.contentScroll = new IScroll(pop[0],{bounce:false});
                    }, 60);
                }
            }
            uexWindow.refreshBounce();
        },
        refreshBounce:function(){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            var win = winStack[winStack.length - 1];
            var pop = win.popOver[win.popOver.length - 1];
            
            if (pop && pop.contentScroll) {
                pop.contentScroll.refresh();
            }
            
        },
        showBounceView: function(inType, inColor, inFlag){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            var win = winStack[winStack.length - 1];
            var pop = win.popOver[win.popOver.length - 1];
            
            
            
        },
        resetBounceView: function(inType){
            
        },
        hiddenBounceView: function(inType){
        },
        notifyBounceEvent: function(inType, inStatus){
        },
        setBounceParams: function(inType, inJson){
        },
        openSlibing: function(inType, inDataType, inUrl, inData, inWidth, inHeight){
        },
        showSlibing: function(inType){
        },
        closeSlibing: function(inType){
        },
        evaluateScript: function(inWindowName, inType, inScript){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            var winIdx = this.findWin(winStack,inWindowName);
            
            if(winIdx < 0){
                return;
            }
            
            var win = winStack[winIdx].find('iframe')[0].contentWindow;
            
            win.eval(inScript);
            
        },
        evaluatePopoverScript: function(inWindowName, inPopName, inScript){
            
            window.eval(inScript);
        },
        loadObfuscationData: function(inUrl){
        },
        back: function(){
        },
        pageBack: function(){
        },
        forward: function(){
        },
        pageForward: function(){
        },
        windowBack: function(){
        },
        windowForward: function(){
        },
        alert: function(inTitle, inMessage, inButtonLable){
            setHtml('loader_alert_1',inTitle);
            setHtml('loader_alert_2',inMessage);
            setHtml('loader_alert_3',inButtonLable);
            $$('loader_alert').style.cssText='background-color:rgba(0,0,0,.5);'	
        },
        closeAlert:function(){
            $$('loader_alert').style.cssText="display: none !important;"	
        },
        confirm: function(inTitle, inMessage, inButtonLable){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            setHtml('loader_confirm_1',inTitle);
            setHtml('loader_confirm_2',inMessage);
            var bl = inButtonLable.length;
            if(bl==1){
                setHtml('loader_confirm_3','<div class="ub-f1 zhy_pading" onclick="uexWindow._cbConfirm(0,0,0)">'+inButtonLable[0]+'</div>');
            }
            if(bl==2){
                setHtml('loader_confirm_3','<div class="ubr zhy_border ub-f1 zhy_pading" onclick="uexWindow._cbConfirm(0,0,0)">'+inButtonLable[0]+'</div><div class="ub-f1 zhy_pading" onclick="uexWindow._cbConfirm(0,0,1)">'+inButtonLable[1]+'</div>');
            }
            if(bl==3){
                setHtml('loader_confirm_3','<div class="ubr zhy_border ub-f1 zhy_pading" onclick="uexWindow._cbConfirm(0,0,0)">'+inButtonLable[0]+'</div><div class="ubr zhy_border ub-f1 zhy_pading" onclick="uexWindow._cbConfirm(0,0,1)">'+inButtonLable[1]+'</div><div class="ub-f1 zhy_pading" onclick="uexWindow._cbConfirm(0,0,2)">'+inButtonLable[2]+'</div>');
            }
            topWindow.Zepto('#loader_confirm').css({
                background:'background-color:rgba(0,0,0,.5);'
            }).show();
            
        },
        _cbConfirm:function (opid, dataType, data){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            
            topWindow.Zepto('#loader_confirm').css({
                display:'none !important'
            });
            
            var win = winStack[winStack.length -1].find('iframe')[0].contentWindow;
            
            win.uexWindow.cbConfirm && win.uexWindow.cbConfirm(opid, 2, data);
            
        },
        prompt: function(inTitle, inMessage, inDefaultValue, inButtonLable){
        },
        toast: function(inType, inLocation, inMsg, inDuration){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            if(parseInt(inType) == 0){
                setHtml('loader_toast_1','<div class="zhy_uinn uc-t1 tx-c"><div class="uinn">'+inMsg+'</div></div>');
            }else{
                setHtml('loader_toast_1','<div class="ub ub-pc ub-ac uinn"><div class="zhy_jiazai"></div></div><div class=" uc-t1 tx-c"><div class="uinn">'+inMsg+'</div></div>');
            }
            if(inDuration&&inDuration!='0'&&parseInt(inDuration)>0){
                var T =  setTimeout(function (){
                    uexWindow.closeToast();
                }, inDuration);
            }
            
            topWindow.Zepto('#loader_toast').css({
                'background':'rgba(0,0,0,.5);'
            }).show();
            
        },
        closeToast: function(){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            topWindow.Zepto('#loader_toast').css({
                'display':'none !important;'
            });
            
            
        },
        actionSheet: function(inTitle, inCancel, inButtonLables){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            
            setHtml('loader_actionsheet_1',inTitle);
            var btnstr = '';
            for(var i=0;i<inButtonLables.length;i++){
                if(i > 4){
                    break;
                }
                btnstr +='<div class="ub tx-c zhy_border ubb"  onclick="uexWindow._cbActionSheet(\''+i+'\')"><div class=" ub-f1 zhy_pading">'+inButtonLables[i]+'</div></div>'
            }
            setHtml('loader_actionsheet_2',btnstr);
            setHtml('loader_actionsheet_3',inCancel);
            
            topWindow.Zepto('#loader_actionsheet').css({
                background:'rgba(0,0,0,.5)'
            });
            
            //style.cssText = 'background-color:rgba(0,0,0,.5);'	
        },
        _cbActionSheet:function(index){
            var topWindow = window.top;
            var uexWindow = topWindow.uexWindow;
            var hash = topWindow.appcan_hash;
            var winStack = topWindow.appcan_winStack;
            
            topWindow.Zepto('#loader_actionsheet').css({
                display:'none !important'
            });
            
            //$$('loader_actionsheet').style.cssText="display: none !important;";
            var win = winStack[winStack.length -1].find('iframe')[0].contentWindow;
            
            if(index){
                win.uexWindow.cbActionSheet && win.uexWindow.cbActionSheet('0','0',index);
            }
        },
        getState: function(){
            return 0
        },
        onOAuthInfo: function(windowName, url){
        },
        setReportKey: function(inKeyCode, inEnable){
        },
        preOpenStart: function(){
        },
        preOpenFinish: function(){
        },
        getUrlQuery: function(){
        },
        didShowKeyboard: function(){
        },
        beginAnimition: function(){
        },
        setAnimitionDelay: function(inDelay){
        },
        setAnimitionDuration: function(inDuration){
        },
        setAnimitionCurve: function(InCurve){
        },
        setAnimitionRepeatCount: function(InCount){
        },
        setAnimitionAutoReverse: function(inReverse){
        },
        makeTranslation: function(inToX, inToY, inToZ){
        },
        makeScale: function(inToX, inToY, inToZ){
        },
        makeRotate: function(inDegrees, inX, inY, inZ){
        },
        makeAlpha: function(inAlpha){
        },
        commitAnimition: function(){
        },
        openAd: function(inType, inDTime, inInterval, inFlag){
        },
        statusBarNotification: function(inTitle, inMsg){
        },
        bringToFront: function(){
        },
        sendToBack: function(){
        },
        insertAbove: function(inName){
        },
        insertBelow: function(inName){
        },
        insertPopoverAbovePopover: function(inNameA, inNameB){
        },
        insertPopoverBelowPopover: function(inNameA, inNameB){
        },
        bringPopoverToFront: function(inName){
            var topWindow = window.top;
            var uwin = topWindow.uexWindow;
            var winStack = topWindow.appcan_winStack;
            var hash = topWindow.appcan_hash;
            
            var curr = winStack[winStack.length - 1];
            
            var popIdx = this.findWin(curr.popOver,inName,1);
            if(popIdx < 0){
                return;
            }
            this.currZIndex++;
            Zepto(curr.popOver[popIdx].container).css('z-index',this.currZIndex);
            
        },
        sendPopoverToBack: function(inName){
        },
        setSwipeRate: function(inRate){
        },
        insertWindowAboveWindow: function(inNameA, inNameB){
        },
        insertWindowBelowWindow: function(inNameA, inNameB){
        },
        setWindowHidden: function(inVisible){
        },
        setOrientation: function(orientation){
        },
        setWindowScrollbarVisible: function(Visible){
        },
        postGlobalNotification:function(){},
        subscribeChannelNotification:function(){},
        publishChannelNotification:function(){},
        getState:function(){},
        statusBarNotification:function(){}
    };
    
    
    
    var uexImageBrowser = {
        viewer:null,
        viewerScroller:null,
        open:function(imgList,index){
            var wx = window.top.wx;
            if(isWeiXin()){
                wx.ready(function(){
                    wx.previewImage({
                        current: index || 0, // 当前显示的图片链接
                        urls: imgList|| [] // 需要预览的图片链接列表
                    });
                });
                return;
            }else{
                var that = this;
                var wt = window.innerWidth;
                //create image preview
                if(!this.viewer){
                    this.viewer = document.createElement('div');
                
                    this.viewer.innerHTML = '<div class="imagewidget_wraper">'+
                            '<div class="imagewidget-header">'+
                            '   <div class="imagewidget-header-close"></div>'+
                            '   <div class="imagewidget-header-index">'+
                            '       <span>0/0</span>'+
                            '   </div>'+
                            '</div>'+
                            '<div class="imagewidget-content-wrap">'+
                            '    <div class="imagewidget-content">'+
                            '    </div>'+
                            '</div>'+
                        '</div>';
                    
                    this.viewer.querySelector('.imagewidget-header-close').onclick = function(){
                        that.viewerScroller.destroy();
                        that.viewerScroller=null;
                        that.viewer.style.display = 'none';
                    };
                    
                }else{
                    that.viewer.style.display = 'block';
                } 
                var cwrap = this.viewer.querySelector('.imagewidget-content-wrap');
                var wcontent = this.viewer.querySelector('.imagewidget-content');
                var imgIndex = this.viewer.querySelector('.imagewidget-header-index > span');
                var tmpList = '';
                
                //reset
                imgIndex.innerHTML = '1/1';
                
                for(var i=0,len=imgList.length;i<len;i++){
                    tmpList += '<div style="width:'+wt+'px"><img style="width:100%;" src="'+imgList[i]+'" /></div>';
                }
                
                wcontent.innerHTML = tmpList;
                imgIndex.innerHTML = '1/'+imgList.length;
                
                wcontent.style.width = window.innerWidth * imgList.length+'px';
                cwrap.style.height = (window.innerHeight - 40 )+"px"
                
                this.viewer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#FFF';
                
                
                
                document.body.appendChild(this.viewer);
                
                this.viewerScroller =  new IScroll('.imagewidget-content-wrap',{momentum:false,snap: true, scrollX: true, scrollY: false, mouseWheel: true});
                
                var viewerScroller = this.viewerScroller;
                
                this.viewerScroller.on('scrollEnd',function(e){
                    var curr = viewerScroller.currentPage;
                    imgIndex.innerHTML = (curr.pageX + 1)+'/'+imgList.length;
                });
                
            }
        },
        pick:function(){
            var wx = window.top.wx;
            if(isWeiXin()){
                wx.ready(function(){
                    wx.chooseImage({
                        success: function (res) {
                            var localIds = res.localIds; // 返回选定照片的本地ID列表，localId可以作为img标签的src属性显示图片
                            //alert(Object.prototype.toString.call(localIds) );
                            //调用uexImageBrowser cbpick
                            uexImageBrowser.cbPick && uexImageBrowser.cbPick(0,1,localIds);
                        }
                    });
                });
                return;
            }else{
                //创建创建input
                var fileSelector = document.createElement('input');
                fileSelector.setAttribute('type','file');
                fileSelector.style.visibility = '';
                fileSelector.style.width = 0;
                fileSelector.style.height = 0;
                //fixed webkit webview bug
                setTimeout(function(){
                    fileSelector.click();
                },0);
                fileSelector.onchange = function(){
                    var localIds = Array.prototype.slice.call(this.files,0);
                    //调用uexImageBrowser cbpick
                    uexImageBrowser.cbPick && uexImageBrowser.cbPick(0,1,localIds);
                };
                document.body.appendChild(fileSelector);
            }
            
        },
        save:function(){
            
        },
        cleanCache:function(){
            
        },
        pickMulti:function(){
            var wx = window.top.wx;
            if(isWeiXin()){
                wx.ready(function(){
                    wx.chooseImage({
                        success: function (res) {
                            var localIds = res.localIds; // 返回选定照片的本地ID列表，localId可以作为img标签的src属性显示图片
                            //调用uexImageBrowser cbpick
                            uexImageBrowser.cbPick && uexImageBrowser.cbPick(0,1,localIds);
                        }
                    });
                });
                return;
            }else{
                //创建创建input
                var fileSelector = document.createElement('input');
                fileSelector.setAttribute('type','file');
                fileSelector.setAttribute('multiple','multiple');
                fileSelector.style.visibility = 'hidden';
                fileSelector.style.width = 0;
                fileSelector.style.height = 0;
                fileSelector.click();
                fileSelector.onchange = function(){
                    var localIds = Array.prototype.slice.call(this.files,0);
                    //调用uexImageBrowser cbpick
                    uexImageBrowser.cbPick && uexImageBrowser.cbPick(0,1,localIds);
                };
                document.body.appendChild(fileSelector);
            }
            
        }
        
    };
    
    
    //uexAudio兼容微信
    var uexAudio = {
        currentPath:'',
        open:function(path){
            if(isWeiXin()){
                this.currentPath = path;
                return;
            }
        },
        play:function(repeats){
            var wx = window.top.wx;
            var that = this;
            if(isWeiXin()){
                wx.ready(function(){
                    wx.playVoice({
                        localId: that.currentPath // 需要播放的音频的本地ID，由stopRecord接口获得
                    });
                    
                    wx.onVoicePlayEnd({
                        success: function (res) {
                            var localId = res.localId; // 返回音频的本地ID
                            uexAudio.onPlayFinished && uexAudio.onPlayFinished(1);
                        }
                    });
                });
                
                return;
            }
        },
        pause:function(){
            var wx = window.top.wx;
            var that = this;
            if(isWeiXin()){
                wx.ready(function(){
                    wx.pauseVoice({
                        localId: that.currentPath // 需要暂停的音频的本地ID，由stopRecord接口获得
                    });
                });
                return;
            }
        },
        replay:function(){
            var wx = window.top.wx;
            var that = this;
            if(isWeiXin()){
                wx.ready(function(){
                    
                    wx.playVoice({
                        localId: that.currentPath // 需要播放的音频的本地ID，由stopRecord接口获得
                    });
                    
                    wx.onVoicePlayEnd({
                        success: function (res) {
                            var localId = res.localId; // 返回音频的本地ID
                            uexAudio.onPlayFinished && uexAudio.onPlayFinished(1);
                        }
                    });
                    
                });
                return;
            }
            
        },
        stop:function(){
            var wx = window.top.wx;
            var that = this;
            if(isWeiXin()){
                
                wx.ready(function(){
                    wx.stopVoice({
                        localId: that.currentPath // 需要停止的音频的本地ID，由stopRecord接口获得
                    });
                });
                return;
            }
        },
        volumeUp:function(){
            
            
        },
        volumeDown:function(){
            
            
        },
        openPlayer:function(){
            
        },
        closePlayer:function(){
            
        },
        startBackgroundRecord:function(mode,filename){
            var wx = window.top.wx;
            if(isWeiXin()){
                wx.ready(function(){
                    wx.startRecord();
                    wx.onVoiceRecordEnd({
                        // 录音时间超过一分钟没有停止的时候会执行 complete 回调
                        complete: function (res) {
                            var localId = res.localId;
                            uexAudio.cbBackgroundRecord && uexAudio.cbBackgroundRecord(0,1,localId);
                        }
                    });
                });
                return;
            }
            //否则不支持
            
        },
        stopBackgroundRecord:function(){
            var wx = window.top.wx;
            if(isWeiXin()){
                wx.ready(function(){
                    wx.stopRecord({
                        success: function (res) {
                            var localId = res.localId;
                            uexAudio.cbBackgroundRecord && uexAudio.cbBackgroundRecord(0,1,localId);
                        }
                    });
                });
                return;
            }
            //否则不支持
            
        },
        record:function(){
            
            
        },
        openSoundPool:function(){
            
            
        },
        addSound:function(){
            
            
        },
        playFromSoundPool:function(){
            
            
        },
        stopFromSoundPool:function(){
            
            
        },
        closeSoundPool:function(){
            
            
        }
    };
    
    
    //获取设备信息
    var uexDevice = {
        vibrate:function(){
            
            
        },
        cancelVibrate:function(){
            
            
        },
        getInfo:function(infoId){
            if(infoId == 13){
                if(isWeiXin()){
                    var wx = window.top.wx;
                    wx.ready(function(){
                        
                        wx.getNetworkType({
                            success: function (res) {
                                var networkType = res.networkType; // 返回网络类型2g，3g，4g，wifi
                                var cbRes = -1;
                                if(networkType == 'wifi'){
                                    cbRes = 0;
                                }else if(networkType == '3g'){
                                    cbRes = 1;
                                }else if(networkType == '2g'){
                                    cbRes = 2;
                                }else if(networkType == '4g'){
                                    cbRes = 3;
                                }
                                uexDevice.cbGetInfo && uexDevice.cbGetInfo(0,1,{
                                    connectStatus:cbRes
                                });
                            }
                        });
                        
                    });
                }
                return;
            }
        }
    };
    
    var uexBaiduMap = {
        currentInfo:{
            latitude:0,
            longitude:0,
            scale:1
        },
        open:function(x,y,width,height,longitute,latitute){
            var wx = window.top.wx;
            var that = this;
            if(isWeiXin()){
                wx.ready(function(){
                    wx.openLocation({
                        latitude: parseFloat(latitute,10) || that.currentInfo.latitude, // 纬度，浮点数，范围为90 ~ -90
                        longitude: parseFloat(longitute,10) || that.currentInfo.longitude, // 经度，浮点数，范围为180 ~ -180。
                        name: '', // 位置名
                        address: '', // 地址详情说明
                        scale: that.currentInfo.scale || 1, // 地图缩放级别,整形值,范围从1~28。默认为最大
                        infoUrl: '' // 在查看位置界面底部显示的超链接,可点击跳转
                    });
                });
            }
        },
        close:function(){
            
        },
        setMapType:function(){
            
            
        },
        setTrafficEnabled:function(){
            
            
        },
        setCenter:function(longitude,latitude){
            
            this.currentInfo.longitude = longitude;
            this.currentInfo.latitude = latitude;
            
        },
        setZoomLevel:function(level){
            
            this.currentInfo.scale = level;
            
        },
        zoomIn:function(){
            
            
        },
        zoomOut:function(){
            
            
        },
        rotate:function(){
            
            
        },
        overlook:function(){
            
            
        },
        setZoomEnable:function(){
            
            
        },
        setRotateEnable:function(){
            
            
        },
        setScrollEnable:function(){
            
            
        },
        setOverlookEnable:function(){
            
            
        },
        addMarkersOverlay:function(){
            
            
        },
        setMarkerOverlay:function(){
            
            
        },
        showBubble:function(){
            
            
        },
        hideBubble:function(){
            
            
        },
        addDotOverlay:function(){
            
            
        },
        addPolylineOverlay:function(){
            
            
        },
        addArcOverlay:function(){
            
            
        },
        addCircleOverlay:function(){
            
            
        },
        addPolygonOverlay:function(){
            
            
        },
        addGroundOverlay:function(){
            
            
        },
        addTextOverlay:function(){
            
            
        },
        removeMakersOverlay:function(){
            
            
        },
        poiSearchInCity:function(){
            
            
        },
        poiBoundSearch:function(){
            
            
        },
        busLineSearch:function(){
            
            
        },
        removeBusLine:function(){
            
            
        },
        perBusLineNode:function(){
            
            
        },
        nextBusLineNode:function(){
            
            
        },
        searchRoutePlan:function(){
            
            
        },
        removeRoutePlan:function(){
            
            
        },
        preRouteNode:function(){
            
            
        },
        nextRouteNode:function(){},
        geocode:function(){
            
            
        },
        reverseGeocode:function(){
            
            
        },
        getCurrentLocation:function(){
            var wx = window.top.wx;
            if(isWeiXin()){
                wx.ready(function(){
                    wx.getLocation({
                        success: function (res) {
                            var latitude = res.latitude; // 纬度，浮点数，范围为90 ~ -90
                            var longitude = res.longitude; // 经度，浮点数，范围为180 ~ -180。
                            var speed = res.speed; // 速度，以米/每秒计
                            var accuracy = res.accuracy; // 位置精度
                            
                            uexBaiduMap.cbCurrentLocation && uexBaiduMap.cbCurrentLocation({
                                latitude:latitude,
                                longitude:longitude,
                                speed:speed,
                                accuracy:accuracy
                            });
                            
                        }
                    });
                });
                return;
            }
            
        },
        startLocation:function(){
            
            
        },
        stopLocation:function(){
            
            
        },
        setMyLocationEnable:function(){
            
            
        },
        setUserTrackingMode:function(){
            
            
        }
    };
    
    var uexScanner = {
        open:function(flag){
            var wx = window.top.wx;
            if(isWeiXin()){
                flag = flag === void 0 ? 1:0;
                wx.ready(function(){
                    wx.scanQRCode({
                        needResult: flag, // 默认为0，扫描结果由微信处理，1则直接返回扫描结果，
                        scanType: ["qrCode","barCode"], // 可以指定扫二维码还是一维码，默认二者都有
                        success: function (res) {
                            var result = res.resultStr; // 当needResult 为 1 时，扫码返回的结果
                            uexScanner.cbOpen && uexScanner.cbOpen(0,1,{
                                type:'',
                                code:result
                            });
                        }
                    });
                });
                return;
            }
        }
    };
    
    var uexWidgetOne = {
        getPlatform:function(){}
    };
    
    
    //执行uexOnload方法
    //window.uexOnload && window.uexOnload(1);
    //window.uexOnload = null;
    
    if(isWebApp){
        window.uexWindow = uexWindow;
        window.uexWidgetOne = uexWidgetOne;
        window.uexImageBrowser = uexImageBrowser;
        window.uexDevice = uexDevice;
        window.uexAudio = uexAudio;
        
        window.uexDevice = uexDevice;
        window.uexBaiduMap = uexBaiduMap;
        window.uexScanner = uexScanner;
        
        //执行uexOnload方法
        window.uexOnload && window.uexOnload(1);
        window.uexOnload = null;
    }
    
    /**
     * @author Administrator
     */
    function ele(s, o, c){
        this[0] = o;
        this.length = 1;
        this.selector = s;
        this.context = c;
        return this;
    }
    
    ele.prototype.find = function(s){
        var nid, id, expando = "sizzle" + -(new Date()), rescape = /'|\\/g;
        function __find(s, e, r){
            try {
                nid = id = expando;
                if ((id = e.getAttribute("id"))) {
                    nid = id.replace(rescape, "\\$&");
                }
                else {
                    e.setAttribute("id", nid);
                }
                nid = "[id='" + nid + "'] ";
                s = nid + s;
                r.push(e.querySelector(s))
            } 
            catch (qsaError) {
            }
            finally {
                if (!id) {
                    context.removeAttribute("id");
                }
            }
        }
        var i, ret = [], self = this, len = self.length;
        
        for (i = 0; i < len; i++) {
            //Sizzle(s, self[i], ret);
            __find(s, self[i], ret);
        }
        if (ret.length){
            return new ele(s, ret[0], self[0]);
        }
        else{ 
            return new ele(s, self[0], self[0]);
        }
    };
    
    ele.prototype.append = function(o){
        this[0].appendChild(o[0]);
        var scripts = o[0].getElementsByTagName("script");
        var remScr = [];
        for (var i = 0; i < scripts.length; i++) {
            var node = scripts[i];
            if (node.src) {
                asyncLoad([node.src], function(){
                });
            }
            else {
                window.eval(node.text || node.textContent || node.innerHTML || "");
            }
        }
    }
    
    ele.prototype.remove = function(){
        this[0].parentNode.removeChild(this[0]);
    }
    
    ele.prototype.css = function(name, value){
        if (name instanceof Array) {
            for (var i in name) {
                this.css(name[i], value[i]);
            }
        }
        else 
            this[0].style[name] = value;
    }

    ele.prototype.addClass = function(a){
        this[0].className += " " + a;
    }

    ele.prototype.removeClass = function(a){
        var s = this[0].className;
        var ar = a.split(" ");
        for (var i in ar) {
            if (ar[i]) 
                s = s.replace(ar[i], "");
        }
        this[0].className = $.trim(s);
    };
    
    ele.prototype.attr = function(id, value){
        if (value){ 
            this[0].attributes.getNamedItem(id).value = value;
        }
        return this[0].attributes.getNamedItem(id).value;
    };

    ele.prototype.empty = function(){
        var node;
        try {
            while ((node = ele[0].childNodes[0])) {
                ele[0].removeChild(node);
            }
        } 
        catch (e) {
        }
    }
    
    ele.prototype.hide = function(){
        this._style = this._style || {};
        this._style.display = this[0].style.display;
        this[0].style.display = "none !important";
    }
    
    ele.prototype.show = function(){
        this._style = this._style || {};
        this[0].style.display = (this._style.display ? this._style.display : "");
    }
    
    ele.prototype.hideclass = function(){
        if(this[0].className=="uhide"){return;}
        this._className = this._className || '';
        this._className = this[0].className;
        this[0].className = "uhide";
    }
    
    ele.prototype.showclass = function(){
        this._className = this._className || '';
        this[0].className = (this._className ? this._className : this[0].className);
    }
    
    ele.prototype.html = function(value){
        var rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi, wrapMap = {
            option: [1, "<select multiple='multiple'>", "</select>"],
            legend: [1, "<fieldset>", "</fieldset>"],
            area: [1, "<map>", "</map>"],
            param: [1, "<object>", "</object>"],
            thead: [1, "<table>", "</table>"],
            tr: [2, "<table><tbody>", "</tbody></table>"],
            col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
            td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
            _default: [1, "X<div>", "</div>"]
        }, rtagName = /<([\w:]+)/;
        var elem = this[0] || {}, i = 0;
        
        if (value === undefined) {
            return elem.nodeType === 1 ? elem.innerHTML.replace("AppCan", "") : undefined;
        }
        // See if we can take a shortcut and just use innerHTML
        if (typeof value === "string" && !wrapMap[(rtagName.exec(value) || ["", ""])[1].toLowerCase()]) {
            value = value.replace(rxhtmlTag, "<$1></$2>");
            try {
                this.empty();
                elem.innerHTML = value;
                elem = 0;
            } 
            catch (e) {
            }
        }
    }

    ele.prototype.load = function(url, params, callback){
        //alert(url+"|===|"+params+"|===|"+callback)
        var selector, response, type, self = this, off = url.indexOf(" ");
        
        if (off >= 0) {
            selector = $.trim(url.slice(off, url.length));
            url = url.slice(0, off);
        }
        if (params && typeof params === "object") {
            type = "POST";
        }
        
        // If we have elements to modify, make the request
        if (self.length > 0) {
            $.ajax({
                url: url,
                type: type,
                dataType: "html",
                data: params,
                success: function(responseText,a,b){
                    //alert("a=="+a+"|==|"+b)
                    //alert("responseText="+responseText);
                    self.html(selector ? $("<div>").append($(responseText)).find(selector) : responseText);
                },
                error:function(err){
                },
                complete: callback
            });
        }
        return this;
    };

    ele.prototype.on=function(s,f){
        this[0]["on"+s]=f;
    }

    ele.prototype.click=function(){
        this[0].click()
    }
    
    var $ = function(s, c){

        var match;
        var rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/;
        if (typeof s === "string") {
            if (s.charAt(0) === "<" && s.charAt(s.length - 1) === ">" && s.length >= 3) {
                // Assume that strings that start and end with <> are HTML and skip the regex check
                c = c || document;
                return $._createEle(s, c);
            }
            else {
                match = rquickExpr.exec(s);
                if (match && (match[1] || !c)) {
                    var elem = document.getElementById(match[2]);
                    return new ele(s, elem, document);
                }
            }
        }
        return null;
    };
    
    window.$_$ = $;

    $.trim = function(t){
        var ws = "[\\x20\\t\\r\\n\\f]", rtrim = new RegExp("^" + ws + "+|((?:^|[^\\\\])(?:\\\\.)*)" + ws + "+$", "g");
        return t == null ? "" : (t + "").replace(rtrim, "");
    }
    $._createEle = function(s, c){
        var safe = document.createDocumentFragment();
        var div = safe.appendChild(c.createElement("div"));
        div.innerHTML = s;
        return new ele(s, div.childNodes[0], c);
    }

    $.parseXML = function(data){
        var xml, tmp;
        if (!data || typeof data !== "string") {
            return null;
        }
        tmp = new DOMParser();
        xml = tmp.parseFromString(data, "text/xml");
        return xml;
    };
    $.extend = function(obj){
        for (var i in obj) {
            $[i] = obj[i];
        }
    };
    $.	noop=function(){}

    $.extend({
        noConflict: function(a){
            return $;
        },
        isPlainObject: function(a){
            return false;
        },
        guid: 1,
        ajaxSettings: {
            type: 'GET',
            beforeSend: $.noop,
            success: $.noop,
            error: $.noop,
            complete: $.noop,
            accepts: {
                script: 'text/javascript, application/javascript',
                json: 'application/json',
                xml: 'application/xml, text/xml',
                html: 'text/html',
                text: 'text/plain'
            },
            headers: {}
        },
        ajax: function(b){
            var g = window, j = g.document, navigator = g.navigator, location = g.location;
            var c = b;
            for (var key in $.ajaxSettings) 
                if (!c[key]) 
                    c[key] = $.ajaxSettings[key];
            if (!c.url) 
                c.url = location.toString();
            if (c.data) {
                var data = [];
                for (var i=0;i<c.data.length;i++) {
                    var item = c.data[i];
                    data.push(item.key + "=" +item.value);
                }
                c.data = data.join("&");
            }
            if (c.data && !c.contentType) {
                c.contentType = 'application/x-www-form-urlencoded';
                c.type = "post";
            }
            var f = c.accepts[c.dataType];
            
            var xhr = null;
            if(window.XMLHttpRequest){
                try{
                    xhr = new XMLHttpRequest();
                }catch(e){
                }
            }else{
                if(window.ActiveXObject){
                    try{
                        xhr = new ActiveXObject("Microsoft.XMLHTTP");
                    }catch(e){
                        try {
                            xhr = new ActiveXObject("MSXML2.XMLHTTP");
                        } catch (e) {
                        }
                    }
                }
            }
            
            if (!!xhr.open) {
                xhr.onprogress = function(a){
                    if (c.downCallback) {
                        c.downCallback(xhr, a)
                    }
                    else {
                        return function(){
                        }
                    }
                }
            }
            
            xhr.onreadystatechange = function(){
                if (c.readyCallback) {
                    c.readyCallback(xhr);
                    return
                }
                if (xhr.readyState == 4) {
                    var a, error = false;
                    //alert("xhr.status=="+xhr.status)
                    if ((xhr.status >= 200 && xhr.status < 300) ||
                    xhr.status == 0) {
                        
                        if (f == 'application/json') {
                            try {
                            //	alert("xhr.responseText="+xhr.responseText)
                                a = eval('('+xhr.responseText+')');
                            } 
                            catch (e) {
                            //	alert("异常")
                                error = e
                            }
                        }
                        else 
                            a = xhr.responseText;
                        if (error){
                            c.error(xhr, 'parsererror', error);
                        }else{
                            c.success(a, 'success', xhr)
                        } 
                            
                    }
                    else {
                        c.error(xhr, 'error')
                    }
                    c.complete(xhr, error ? 'error' : 'success')
                }
            };
        //	alert(c.type+"--"+c.url);
            xhr.open(c.type, c.url, true);
            if (c.beforeSend && c.beforeSend(xhr, c) === false) {
                xhr.abort();
                return false
            }
            if (c.contentType) 
                c.headers['Content-Type'] = c.contentType;
            for (var hi in c.headers) 
                xhr.setRequestHeader(hi, c.headers[hi]);
                xhr.setRequestHeader("If-Modified-Since","0");
            xhr.send(c.data);
            return xhr
        },
        getJSON: function(url, callback,type,err,method,data){
            $.ajax({
                url: url,
                type: method,
                dataType: type || "json",
                data: data,
                success: callback,
                error:err
            });
        },
        merge:function(a,b){
                for(var j=0;j<b.length;j++)
                {
                    a.push(b[j]);
                }
        },
        postForm:function(id,cb,err,ty,u)
        {
            var it=[];
            var f = $(id)[0];
            var url = (u||f.action);
            var m = (f.method.toLowerCase()=="get");
            $.merge(it,f.getElementsByTagName("input"));
            $.merge(it,f.getElementsByTagName("textarea"));
            $.merge(it,f.getElementsByTagName("select"));
            var data = [];
            for(var i=0;i<it.length;i++)
            {
                if(it[i].type == "file")
                {
                    var t=	new Date().getTime();
                    window[t] = cb;
                    f.action=url+"?t="+t;
                    return true;
                }
                if(it[i].name !== undefined)
                {
                    m?(data.push(it[i].name+"="+encodeURIComponent(it[i].value))):(data.push({key:it[i].name,type:"0",value:encodeURIComponent(it[i].value)}));
                    
                }
            }
            if(m) url=url+"?"+data.join("&");
            $.getJSON(url,cb,ty,err,f.method,m?null:data);
            return false;
        }
    });


        var $support = {
            transform3d: ('WebKitCSSMatrix' in window),
            touch: ('ontouchstart' in window)
        };

        var $E = {
            start: $support.touch ? 'touchstart' : 'mousedown',
            move: $support.touch ? 'touchmove' : 'mousemove',
            end: $support.touch ? 'touchend' : 'mouseup',
            cancel: $support.touch ? 'touchcancel' : '',
            transEnd:transitionEvent
        };
        function getPage (event, page) {
            return $support.touch ? event.changedTouches[0][page] : event[page];
        }
        var zyClick = function(selector,clickFun,css){
            var self = this;
            self._clickFun = clickFun || null;
            self._click=false;
            self.css = css;
            if(typeof selector == 'object')
                self.element = selector;
            else if(typeof selector == 'string')
                self.element = document.getElementById(selector);
            self.attribute=self.element.getAttribute("onclick");
            self.element.removeAttribute("onclick");
            self.element.addEventListener($E.start, self, false);
            self.element.addEventListener($E.move, self, false);
            self.element.addEventListener($E.end, self, false);
            if($E.cancel!="")
            {
                self.element.addEventListener($E.cancel, self, false);
                document.addEventListener($E.cancel, self, false);
            }
            document.addEventListener($E.end, self, false);
            
            return self;
        }

        zyClick.prototype = {
            handleEvent: function(event) {
                var self = this;
                switch (event.type) {
                    case $E.start:
                        self._touchStart(event);
                        break;
                    case $E.move:
                        self._touchMove(event);
                        break;
                    case $E.end:
                    case $E.cancel:
                        self._touchEnd(event);
                        break;
                }
            },
            _touchStart: function(event) {
                
                var self = this;
                self.start = true;
                self._click=true;
                self.startPageX = getPage(event, 'pageX');
                self.startPageY = getPage(event, 'pageY');
                self.startTime = event.timeStamp;
                if (self.css && !self.touchTime) {
                    self.touchTime=setTimeout(function(){
                        if (self._click && self.element.className.indexOf(self.css)<0) 
                            self.element.className += (" " + self.css);
                    }, 50);
                }
            },
            _touchMove: function(event) {
                
                var self = this;
                if(!self.start)
                    return;

                var pageX = getPage(event, 'pageX'),
                    pageY = getPage(event, 'pageY'),
                    deltaX = pageX - self.startPageX,
                    deltaY = pageY - self.startPageY;

               if((Math.abs(deltaX)>5 || Math.abs(deltaY)>5))
               {
                    if (self._click) {
                        clearTimeout(self.touchTime);
                        self.touchTime = null;
                        self._click = false;
                        if (self.css) 
                            self.element.className = self.element.className.replace(" " + self.css, "");
                    }
               }		
               else{

               }
            },
            _touchEnd: function(event) {
                
                var self = this;
                
                if(self.start == true)
                {
                    if (self.touchTime) {
                        clearTimeout(self.touchTime);
                        self.touchTime=null;
                    }
                    self.start = false;
                    if(self.css)
                        self.element.className=self.element.className.replace(" "+self.css,"");
                    if(self._click)
                    {
                        self._click=false;
                        if(event.timeStamp - self.startTime>1000)
                            return;
                        if(event.type==$E.cancel)
                            return;
                        if(self._clickFun)
                            self._clickFun(self.element);
                        if(self.attribute)
                            eval(self.attribute);
                    }
                }
            },
            destroy: function() {
                var self = this;

                self.element.removeEventListener($E.start, self);
                self.element.removeEventListener($E.move, self);
                self.element.removeEventListener($E.end, self);
                self.element.removeEventListener($E.cancel, self);
                document.removeEventListener($E.end, self);
                document.removeEventListener($E.cancel, self);
            }
        }



    function zy_selectmenu(id){
        var sl = document.getElementById(id);
        if (sl) {
            var sp = sl.parentElement; //<span>
            if (sp) {
                var ch = sp.getElementsByTagName("div")[0];
                var t = sl.options[sl.selectedIndex].text;
                if (ch) {
                    ch.innerHTML = t;
                }
            }
        }
        uexWindow.refreshBounce();
    }


    function zy_for(e, cb){
        e.stopPropagation();
        var ch;
        if (e.currentTarget) 
            ch = e.currentTarget.previousElementSibling;
        else 
            ch = e.previousElementSibling;
        if (ch.nodeName == "INPUT") {
            if (ch.type == "checkbox") {
                    ch.checked = !ch.checked;
            }
            if (ch.type == "radio" && !ch.checked) 
                ch.checked = "checked";
        }
        if (cb){ cb(e, ch.checked);
            uexWindow.refreshBounce();
            } 
           
            
    }
    var  click_num=0;
    function zy_for1(e, cb){
        e.stopPropagation(); 		
        var ch;
        if (e.currentTarget) 
            ch = e.currentTarget.previousElementSibling;
        else 
            ch = e.previousElementSibling;
        if (ch.nodeName == "INPUT") {
            if (ch.type == "checkbox") {
                if(click_num==0){
                    ch.checked = !ch.checked;
                }
                click_num++;
                setTimeout(function(){click_num=0},1000);
            }
            if (ch.type == "radio" && !ch.checked) 
                ch.checked = "checked";
            
        }
        if (cb){
            cb(e, ch.checked);
            uexWindow.refreshBounce();
        }
        
    }


    function zy_fold(e, col){
        e.stopPropagation();
        var a = e.currentTarget.nextElementSibling;
        if (a.nodeName == "DIV") {
            if (col) 
                a.className = a.className.replace("col-c", "");
            else 
                a.className += ' col-c';
        }
            uexWindow.refreshBounce();
            
    }

    function zy_touch(c, f){
        var t = event.currentTarget;
        if (!t.zTouch) {
            t.zTouch = new zyClick(t, f, c);
            t.zTouch._touchStart(event);
        }
    //event.stopPropagation();
    }

    function zy_parse(){
        var params = {};
        var loc = String(document.location);
        if (loc.indexOf("?") > 0) 
            loc = loc.substr(loc.indexOf('?') + 1);
        else 
            loc = uexWindow.getUrlQuery();
        var pieces = loc.split('&');
        params.keys = [];
        for (var i = 0; i < pieces.length; i += 1) {
            var keyVal = pieces[i].split('=');
            params[keyVal[0]] = decodeURIComponent(keyVal[1]);
            params.keys.push(keyVal[0]);
        }
        return params;
    }

    function $$(id){
        return document.getElementById(id);
    }
    //alert('1111');


    function int(s){
        return parseInt(s);
    }


    function zy_con(id, url, x, y){
        if(window.getComputedStyle){
            var s = window.getComputedStyle($$(id), null);
            uexWindow.openPopover(id, "0", url, "", int(x), int(y), int(s.width), int(s.height), int(s.fontSize), "0");
        }else{
            var s = $$(id);
            uexWindow.openPopover(id, "0", url, "", int(x), int(y), int(s.clientWidth), int(s.clientHeight), int(s.style.fontSize), "0");
        }
        
    //	if(window.getComputedStyle){
    //		var s = window.getComputedStyle($$(id), null);
    //	}else{
    //		var s = $$(id);
    //	}
    //    
    //    uexWindow.openPopover(id, "0", url, "", int(x), int(y), int(s.width), int(s.height), int(s.fontSize), "0");
    }
    
    function zy_resize(id, x, y){
        var s = window.getComputedStyle($$(id), null);
        uexWindow.setPopoverFrame(id, int(x), int(y), int(s.width), int(s.height));
    }

    function zy_init(){
        if (window.navigator.platform == "Win32"){
            if (navigator.userAgent.indexOf("IE") > 0) {
                //document.documentElement.style.fontSize = window.localStorage["defaultfontsize"];
            }else{
                document.body.style.fontSize = window.localStorage["defaultfontsize"];
            }
            
        } 
            
    }

    function zy_cc(t){
        if (!t.cancelClick) {
            t.cancelClick = true;
            t.addEventListener("click", function(){
                event.stopPropagation();
            }, true);
        }
    }


    function getSelector(s){
        if (s.nodeType && s.nodeType == 1) {
            return s;
        }
        else 
            if (typeof s == 'string') {
                return (document.getElementById(s) || document.querySelector(s));
            }
        return null;
    }

    function zy_anim_listen(s, c){
        var sel = getSelector(s);
        if (sel.animCB != c) {
            if (sel.animCB) {
                sel.removeEventListener(transitionEvent, sel.animCB, true);
            }
            sel.animCB = c;
            if (c) {
                if (navigator.userAgent.indexOf("IE") > 0) {
                    sel.attachEvent(transitionEvent, c);
                }else{
                    sel.addEventListener(transitionEvent, c, true);
                }
            }
        }
    }

    function zy_anim_push(s, a){
        var sel = getSelector(s);
        if (sel) {
            if (sel.className.indexOf(a) < 0) 
                sel.className += " " + a;
        }
    }

    function zy_anim_pop(s, a){
        var sel = getSelector(s);
        if (sel) {
            if (a) 
                sel.className = sel.className.replace(a, "");
            else {
                var n = sel.className.lastIndexOf(" ");
                if (sel.className.substr(n).indexOf(" a-") >= 0) 
                    sel.className = sel.className.substr(0, n);
            }
        }
    }


   
    function setNum(s){
        return (int(s)>9) ? s : '0'+s;
    }
    //日历
    function calendar(){
        var pages = {
            curid: 1,
            updr: '0'
        };
        pages[1] = {
            curpage: 1,
            totpage: 1,
            ld: 0
        };
        

        
        var mydate = new Date();
        var ty = mydate.getFullYear(); /*年*/
        var tm = mydate.getMonth() + 1; /*月*/
        var td = mydate.getDate(); /*天*/
        var tw = mydate.getDay(); /*星期*/
        var choosedate = ty + '-' + setNum(tm) + '-' + setNum(td);
        pages[1].cid_m = ty + '-' + tm + '-'; /*当前的年月份*/
        pages[1].cid = pages[1].cid_m + td + '-1'; /*选中的日期*/
        function getWeek1(){
            var d = td;
            var w = tw;
            var day1 = w - (d - 1) % 7;
            day1 = day1 < 0 ? (day1 + 7) : day1
            return day1;
        }
        
        function setTitle(_id, _y, _m){
            var yyy = 'year' + _id;
            var mmm = 'month' + _id;
            setHtml("loader_cale_title", '<span id="' + yyy + '">' + _y + '</span>年<span id="' + mmm + '">' + _m + '</span>月');
        }
        
        /*获取月的天数*/
        function getDays1moth(year, month){
            month = parseInt(month, 10);
            var temp = new Date(year, month, 0);
            return temp.getDate();
        }
        
        
        var str1 = '<div class="ub-f1 ubt b-gra ub ulev1 t-bold t-day">';
        var str3 = '</div>';
        var str_w = '\');"><div class="ub-f1" style="height:.5em;"></div><div style="width:1.5em" class="ub ub-pc">';
        var str2_l = '<div class="ub-f1 ubr b-gra ub ub-ver ub-ac ub-pc t-p';
        var str2_l_t = str2_l;
        var str2_ck = '" ontouchstart="zy_touch()" onclick="cale.setAct(\'';//\');">';
        var str4 = '</div><div class="ub-f1 ub" style="height:.5em; width:1.7em; padding-bottom:.1em;"></div></div>';
        /*加载当前月日历*/
        function loadDate(_m, _y, _id){
            var str = '';
            var dw = getWeek1();
            var y = _y;
            var m = _m;
            if (tm == 1) {
                m = 12;
                y = y - 1;
            }
            else 
                m--;
            var yp = _y;
            var mp = _m;
            if (tm == 12) {
                mp = 1;
                yp++;
            }
            else 
                mp++;
            var pMonthL = getDays1moth(y, m); /*上月天数*/
            var tMonthL = getDays1moth(_y, _m); /*当月天数*/
            var k = 0;
            var x = 0;
            
            setTitle(_id, _y, _m);
            
            for (var i = 1; i < 43; i++) {
                var j = i % 7;
                if (j == 0) 
                    str2_l = str2_l + ' ubr-no';
                else {
                    str2_l = str2_l_t;
                    if (j == 1) 
                        str += str1;
                }
                
                if (i <= 7) {
                    k = (pMonthL + i - dw) % pMonthL;
                    if (k == 0) 
                        k = pMonthL;
                    
                    var id = y + '-' + m + '-' + k + '-' + _id;
                    var ss = str2_l + '" id="' + id + str2_ck + id + str_w;
                    if (k < 8) { /*上月后几天*/
                        id = _y + '-' + _m + '-' + k + '-' + _id;
                        ss = str2_l + ' t-day2" id="' + id + str2_ck + id + str_w;
                    }
                    
                    str += ss + k + str4;
                }
                else {
                    x = (++k) % tMonthL;
                    if (0 == x) 
                        x = tMonthL;
                    var id = _y + '-' + _m + '-' + x + '-' + _id;
                    var ss = str2_l + ' t-day2" id="' + id + str2_ck + id + str_w;
                    if (i > 28) {
                        id = yp + '-' + mp + '-' + x + '-' + _id;
                        if (x < 8) 
                            ss = str2_l + '" id="' + id + str2_ck + id + str_w; /*下月头几天*/
                        //else if(k==td) ss = str2_l+' t-day-act" id="'+ id +str2_ck+ id+str_w;
                    }
                    
                    str += ss + x + str4;
                }
                
                if (j == 0) 
                    str += str3;
                if (i == 35 && x < 7) 
                    break;
            }
            
            setHtml('cal' + _id, str);
            var o = pages[_id];
            zy_anim_push(o.cid, 't-day-today t-day-act');
        }
        
        /*加载前后月日历*/
            this.loadDateNext=function(_next, _day, _id){
            var e1 = $$('year' + _id);
            var e2 = $$('month' + _id);
            var cy = int(e1.innerText);
            var cm = int(e2.innerText);
            var ny = cy;
            var nm = cm;
            var mm = 0;
            var my = cy;
            if (_next) {
                nm++;
                if (nm > 12) {
                    nm = 1;
                    ny++;
                }
                
                mm = nm + 1;
                my = ny;
                if (mm > 12) {
                    mm = 1;
                    my++;
                }
            }
            else {
                nm--;
                if (nm == 0) {
                    nm = 12;
                    ny--;
                }
                
                mm = nm - 1;
                my = ny;
                if (nm == 0) {
                    mm = 12;
                    my--;
                }
            }
            
            var actDay = 1;
            if (ty == ny && tm == nm) 
                actDay = td;
            if (_day) 
                actDay = _day;
            setTitle(_id, ny, nm);
            var cds = getDays1moth(cy, cm);
            var nds = getDays1moth(ny, nm);
            var mds = getDays1moth(my, mm);
            var str = '';
            var cale = $$('cal' + _id);
            if (_next) {
                var lf = int(cale.lastElementChild.firstElementChild.children[1].innerText);
                var lft = lf;
                if ((lf + 7 - 1) == cds) 
                    lf = 1;
                
                for (var i = 1; i < 43; i++) {
                    var j = i % 7;
                    var k = int(i / 7);
                    
                    if (j == 0) 
                        str2_l = str2_l + ' ubr-no';
                    else {
                        str2_l = str2_l_t;
                        if (j == 1) 
                            str += str1;
                    }
                    
                    var id = '';
                    var ss = '';
                    var x = 0;
                    if (lf > 20) {
                        var dif = cds - lf + 1;
                        if (i <= dif) { /*上月后几天*/
                            x = lft;
                            id = cy + '-' + cm + '-' + x + '-' + _id;
                            ss = str2_l + '" id="' + id + str2_ck + id + str_w;
                        }
                        else {
                            x = (i - dif) % nds;
                            if (x == 0) 
                                x = nds;
                            id = ny + '-' + nm + '-' + x + '-' + _id;
                            ss = str2_l + ' t-day2" id="' + id + str2_ck + id + str_w;
                        }
                        
                        if (lft > 58 && x < 8) {
                            id = my + '-' + mm + '-' + x + '-' + _id;
                            ss = str2_l + '" id="' + id + str2_ck + id + str_w;
                        }
                        
                        str += ss + x + str4;
                        lft++;
                    }
                    else {
                        x = i % nds;
                        if (x == 0) 
                            x = nds;
                        id = ny + '-' + nm + '-' + x + '-' + _id;
                        ss = str2_l + ' t-day2" id="' + id + str2_ck + id + str_w;
                        if (i > 28 && x < 8) { /*下月头几天*/
                            id = my + '-' + mm + '-' + x + '-' + _id;
                            ss = str2_l + '" id="' + id + str2_ck + id + str_w;
                        }
                        str += ss + x + str4;
                    }
                    
                    if (j == 0) 
                        str += str3;
                    if (i == 35 && (x < 7 || x == nds)) 
                        break;
                }
            }
            else {
                var lf = int(cale.firstElementChild.firstElementChild.children[1].innerText);
                if (lf == 1) 
                    lf = nds + 1;
                lf = mds + 1 - (7 - ((lf - 1) % 7));
                if (lf > 20 && mds == (lf + 7 - 1)) 
                    lf = 1;
                var lft = lf;
                
                for (var i = 1; i < 43; i++) {
                    var j = i % 7;
                    var k = int(i / 7);
                    
                    if (j == 0) 
                        str2_l = str2_l + ' ubr-no';
                    else {
                        str2_l = str2_l_t;
                        if (j == 1) 
                            str += str1;
                    }
                    
                    var id = '';
                    var ss = '';
                    var x = 0;
                    if (lf > 20) {
                        var dif = mds - lf + 1;
                        if (i <= dif) { /*上月后几天*/
                            x = lft;
                            id = my + '-' + mm + '-' + x + '-' + _id;
                            ss = str2_l + '" id="' + id + str2_ck + id + str_w;
                        }
                        else {
                            x = (i - dif) % nds;
                            if (x == 0) 
                                x = nds;
                            id = ny + '-' + nm + '-' + x + '-' + _id;
                            ss = str2_l + ' t-day2" id="' + id + str2_ck + id + str_w;
                        }
                        
                        if (lft > 58 && x < 8) {
                            id = cy + '-' + cm + '-' + x + '-' + _id;
                            ss = str2_l + '" id="' + id + str2_ck + id + str_w;
                        }
                        str += ss + x + str4;
                        lft++;
                    }
                    else {
                        x = i % nds;
                        if (x == 0) 
                            x = nds;
                        id = ny + '-' + nm + '-' + x + '-' + _id;
                        ss = str2_l + ' t-day2" id="' + id + str2_ck + id + str_w;
                        if (i > 28 && x < 8) { /*下月头几天*/
                            id = cy + '-' + cm + '-' + x + '-' + _id;
                            ss = str2_l + '" id="' + id + str2_ck + id + str_w;
                        }
                        str += ss + x + str4;
                    }
                    
                    if (j == 0) 
                        str += str3;
                    if (i == 35 && (x < 7 || x == nds)) 
                        break;
                }
            }
            
            var o = pages[_id];
            o.cid_m = ny + '-' + nm + '-';
            o.cid = o.cid_m + actDay + '-' + _id;
            o.days = nds;
            o.ty = ny;
            o.tm = nm;
            setHtml('cal' + _id, str);
            //设置默认日期
            if (ny == ty && nm == tm) 
                zy_anim_push(o.cid, 't-day-today');
            this.setAct(o.cid);
        }
        this.setAct=function(_id){
            var i = pages.curid;
            var o = pages[i];
            
            var res = _id.indexOf(o.cid_m);
            if (res == 0) {
                var a = ' t-day-act';
                zy_anim_pop(o.cid, a);
                zy_anim_push(_id, a);
                o.cid = _id;
                
                var loc = _id.lastIndexOf('-');
                if (loc > 0) {
                    var str = _id.substring(0, loc);
                    var curdd=str.split('-');
                    choosedate = curdd[0] + '-' + setNum(curdd[1]) + '-' + setNum(curdd[2]);
                }
            }
            else {
                return;
                var y = int(o.ty);
                var m = int(o.tm);
                var d = int(o.days);
                var co = o.cid_m.split('-');
                var cy = int(co[0]);
                var cm = int(co[1]);
                if (y > cy) 
                    loadDateNext(1, d, i);
                else 
                    if (y < cy) 
                        loadDateNext(0, d, i);
                    else {
                        if (m > cm) 
                            loadDateNext(1, d, i);
                        else 
                            loadDateNext(0, d, i);
                    }
            }
        }
        this.getchoose=function (){
            //$$('loader_calendar').className='uhide zhy_bbj'
            $$('loader_calendar').style.cssText="display: none !important; background-color: rgba(0, 0, 0, 0.5);"
            return this.cb(0,choosedate);
        }
        this.cancelchoose=function (){
            //$$('loader_calendar').className='uhide zhy_bbj'
            $$('loader_calendar').style.cssText="display: none !important; background-color: rgba(0, 0, 0, 0.5);"
            return ;//this.cb(-1);
        }
        loadDate(tm, ty, 1);
        this.show=function(cb){
            this.cb = cb;
            $$('loader_calendar').style.cssText="background-color: rgba(0, 0, 0, 0.5);"
        }
        return this;
    }

    var zy_tmpl_count=function(dd)
        {
            if(Object.prototype.toString.apply(dd)==="[object Array]")
            {
                return dd.length;
            }
            else
            {	
                var c=0;
                for(var i in dd)
                    c++;
                return c;
            }
        }	
        var _f = function(d,c,k1,k2,l){
            var q = c.match(/(first:|last:)(\"|\'*)([^\"\']*)(\"|\'*)/);
            if(!q) return;
            if(q[1]==k1){
                if(q[2]=='\"'||q[2]=='\''){
                    return q[3];
                }
                else
                    return d[q[3]];
            }
            else if(q[1]==k2 && l>1)
                return "";
        }
        var t_f = function(t,d,i,l,cb){
                return t.replace( /\$\{([^\}]*)\}/g,function(m,c){
                if(c.match(/index:/)){
                    return i;
                }
                if(c.match(/cb:/) && cb){
                    return cb(d,c.match(/cb:(.*)/));
                }
                if(i==0){
                    var s=_f(d,c,"first:","last:",l);
                    if(s) return s;
                }
                if(i==(l-1)){
                    var s= _f(d,c,"last:","first:",l);
                    if(s) return s;
                }
                var ar=c.split('.');
                var res=d;
                for(var key in ar)
                    res=res[ar[key]];
                return res||"";
            });
        }
        
    var zy_tmpl = function(t,dd,l,cb,scb){
        var r = "";
        {
            var index=0;
            for(var i in dd)
            {
                if(scb)
                    scb(0,i,dd[i]);
                var rr=t_f(t,dd[i],index,l,cb);
                if(scb)
                    scb(1,rr,dd[i]);
                r+=rr;
                index++;
            }
        }
        return r;	
    }

    var zy_tmpl_s = function(t,dd,cb){
        return t_f(t,dd,-1,-1,cb);
    }
    
    //向指定的选项填充内容
    function setHtml(id, html,showstr) {
        var topWindow = window.top;
        var uexWindow = topWindow.uexWindow;
        var hash = topWindow.appcan_hash;
        
        var showval = isDefine(showstr)? showstr : "";
        
        if ("string" == typeof(id)) {
            var ele = topWindow.Zepto('#'+id);
            if (ele != null) {
                ele.html(isDefine(html) ? html : showval);
            }else{
                
            }
        } else if (id != null) {
            id.innerHTML = isDefine(html) ? html : showval;
        }
    }
    function isDefine(value){
        if(value == null || value == "" || value == "undefined" || value == undefined || value == "null" || value == "(null)" || value == 'NULL' || typeof(value) == 'undefined'){
            return false;
        }
        else{
            value = value+"";
            value = value.replace(/\s/g,"");
            if(value == ""){
                return false;
            }
            return true;
        }
    }
    /**
     * alert 和 confirm 弹出框
     * @param String str 提示语
     * @param Function callback confirm的回调函数
     */
    function $alert(str,callback){
        if(callback){
            uexWindow.cbConfirm = function(opId,dataType,data){
                if(data == 0)
                    callback(); 
            }
            uexWindow.confirm('提示',str,['确定','取消']);
        }else
            uexWindow.alert('提示',str,'确定');
    }
    /**
     * localStorage保存数据
     * @param String key  保存数据的key值
     * @param String value  保存的数据
     */
    var isLs = window.localStorage?1:0;
    var shibie = 0;
    function setLocVal(key,value){
        if(isLs == 1)
        {
            //document.cookie=key+"="+escape(value)+";";
            try{
                
                window.localStorage[key] = value;
                shibie = 1;
            }catch(err){
    //			if(err.name == "QuotaExceededError"){
    //				localStorage.clear();
    //				localStorage.setItem(key,value);
    //				alert(123123);
    //			}
                shibie = 2;
                document.cookie=key+"="+escape(value)+";";
            }
            
        }
        else{
            uexWindow.key = value;
        }
    }

    /**
     * 根据key取localStorage的值
     * @param Stirng key 保存的key值
     */
    function getLocVal(key){
        if (isLs) {
                if(shibie == 1){
                    var value = window.localStorage[key];
                    return value;
                }else if(shibie == 2){
                    c_start = document.cookie.indexOf(key + "=");
                    if (c_start != -1) {
                        c_start = c_start + key.length + 1;
                        c_end = document.cookie.indexOf(";", c_start);
                        if (c_end == -1) {
                            c_end = document.cookie.length;
                        }
                        return unescape(document.cookie.substring(c_start, c_end));
                    }
                }
            
    //		if (window.localStorage[key]) 
    //			return window.localStorage[key];
    //		else 
    //		return "";
        }else {
                return uexWindow.key?uexWindow.key:'';
            }
        
            
    }
    /**
     * 清除缓存
     * @param Striong key  保存数据的key，如果不传清空所有缓存数据
     */
    function clearLocVal(key){
        if (isLs) {
            if (key) 
                window.localStorage.removeItem(key);
            else 
                window.localStorage.clear();
        }else{
            uexWindow.key = null;
        }
    }
    function trim(str){ //删除左右两端的空格
        return str.replace(/(^\s*)|(\s*$)/g, "");
    }
    function ltrim(str){ //删除左边的空格
        return str.replace(/(^\s*)/g,"");
    }
    function rtrim(str){ //删除右边的空格
        return str.replace(/(\s*$)/g,"");
    }
    /**
     * 计算字符串的长度
     * @param String strTemp
     */
    function fucCheckLength(strTemp) {
        var i, sum;
        sum = 0;
        for (i = 0; i < strTemp.length; i++) {
            if ((strTemp.charCodeAt(i) >= 0) && (strTemp.charCodeAt(i) <= 255))
                sum = sum + 1;
            else
                sum = sum + 2;
        }
        return sum;
    }
    /**
     * 输出loag
     * @param String s 需要输出的信息
     * @param String a 添加的标注信息
     */
    function logs(s,a){
        if(typeof s == 'object'){
            s = JSON.stringify(s);
        }
        a = a ? a : "";
        if(!isPhone){
            console.log(a+s);
        }else{
            uexLog.sendLog(a+s);
        }
    }
    /**
     * 根据时间戳获取年、月、日
     * @param String str 时间戳
     * @param Boolean f 是否在原来的基础上*1000，true要*，false或不填就不*
     */
    function getMakeTimes(str,f){
        var t = (f) ? int(str) : int(str)*1000;
        var d = new Date(t);
        var y = d.getFullYear();
        var m = setNum(d.getMonth()+1);
        var d = setNum(d.d.getDate());
        return y+"-"+m+"-"+d;
    }


    /**
    *计算2个日期相差多少天
    *@param String strDateStart和strDateEnd 日期，格式为2014-04-04
    */
    function getDays(strDateStart,strDateEnd){
       var strSeparator = "-"; //日期分隔符
       var oDate1;
       var oDate2;
       oDate1= strDateStart.split(strSeparator);
       oDate2= strDateEnd.split(strSeparator);
       var strDateS = new Date(oDate1[0] + "-" + oDate1[1] + "-" + oDate1[2]);
       var strDateE = new Date(oDate2[0] + "-" + oDate2[1] + "-" + oDate2[2]);
       var iDays = parseInt(Math.abs(strDateS - strDateE ) / 1000 / 60 / 60 /24)//把相差的毫秒数转换为天数 
       return iDays;
    }
    /**
     * getJSON请求数据的错误回调函数
     * @param {Object} err 返回的错误对象
     */
    function getJSONError(err){
        if (err.message == 'network error!') {
            $alert('网络未连接');
        }else if (err.message == 'json parse failed!') {
            $alert('json解析失败');
        }else if (err.message == 'file does not exist!') {
            $alert('文件不存在');
        }else if (err.message == 'read file failed!') {
            $alert('文件读取错误');
        }else {
            //$alert('发现未知错误');
        }
    }
    /**
     * json对象转为string
     * @param {Object} j
     */
    function json2str(j){
        return JSON.stringify(j);
    }
    /**
     * string转为json对象
     * @param String s
     */
    function str2json(s){
        return JSON.parse(s);
    }
    /**
     * 取input数据
     * @id: input标签id
     * 返回值：数据内容
     */
    function getValue(id){
        var e = $$(id);
        if(e) return e.value;
    }
    /**
     * 设置input数据
     * @id: input标签id
     * @val: 要设置的数据
     */
    function setValue(id, val){
        var e = $$(id);
        if(e) e.value = val;
    }
    /**
     * 创建DOM节点
     * @param String t
     */
    function createEle(t){
        return document.createElement(t);
    }
    /**
     * 删除DOM节点
     * @param String id
     */
    function removeNode(id){
        var e = $$(id);
        if(e) e.parentElement.removeChild(e);
    }
    //判断正整数
    function shuzi(id){
        var mi=/\d+/;
        if(!mi.test(id)){
            return false;
        }else{
            return true;
        }
    }

    //判断100的正整数
    function bai(num){
        var r = /^[1-9]\d*00$/;
        if(!r.test(num)){
            return false;
        }else{
            return true;
        }
    }

    /**
     * @param String inWndName 新窗口名称
     * @param String html		新窗口路径
     * @param String inAniID	打开动画
     * @param String f
     */
    function openNewWin(inWndName,html,inAniID,f){
        if(inAniID == 0){
            uexWindow.open(inWndName,'0',html,0,'','',(f)?f:0);
            return;
        }
        if(inAniID)
            uexWindow.open(inWndName,'0',html,inAniID,'','',(f)?f:0);
        else
            uexWindow.open(inWndName,'0',html,10,'','',(f)?f:0);
    }

    /**
     * 关闭窗口
     * @param string n 关闭窗口动画，默认-1
     */
    function winClose(n){
        if(n){
            uexWindow.close(n);
            return;
        }
        if(parseInt(n)==0){
            uexWindow.close(n);
            return;
        }
        uexWindow.close(-1);
    }

    /**
     * 显示加载框
     * @param String mes 显示的提示语
     * @param String t  毫秒数 窗口存在时间 有的话显示框不显示那个“圈”，并且在t时间后消失
     */
    function $toast(mes,t){
        uexWindow.toast(t?'0':'1','5',mes,t?t:0);
    }
    function $toast1(mes,t){
        uexWindow.toast(t?'0':'1','2',mes,t?t:0);
    }
    /**
     * 手动关闭加载框
     */
    function $closeToast(){
        uexWindow.closeToast();
        uexWindow.refreshBounce();
    }
    /**
     * 在其他窗口中执行指定主窗口中的代码
     * @param String wn  需要执行代码窗口的名称
     * @param String scr 需要执行的代码
     */
    function uescript(wn, scr){
        uexWindow.evaluateScript(wn,'0',scr);
    }
    
    
})()



/*! appcan v0.1.3 |  from 3g2win.com */var Zepto=function(){var a,b,c,d,e=[],f=e.slice,g=e.filter,h=window.document,i={},j={},k={"column-count":1,columns:1,"font-weight":1,"line-height":1,opacity:1,"z-index":1,zoom:1},l=/^\s*<(\w+|!)[^>]*>/,m=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,n=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,o=/^(?:body|html)$/i,p=/([A-Z])/g,q=["val","css","html","text","data","width","height","offset"],r=["after","prepend","before","append"],s=h.createElement("table"),t=h.createElement("tr"),u={tr:h.createElement("tbody"),tbody:s,thead:s,tfoot:s,td:t,th:t,"*":h.createElement("div")},v=/complete|loaded|interactive/,w=/^[\w-]*$/,x={},y=x.toString,z={},A,B,C=h.createElement("div"),D={tabindex:"tabIndex",readonly:"readOnly","for":"htmlFor","class":"className",maxlength:"maxLength",cellspacing:"cellSpacing",cellpadding:"cellPadding",rowspan:"rowSpan",colspan:"colSpan",usemap:"useMap",frameborder:"frameBorder",contenteditable:"contentEditable"},E=Array.isArray||function(a){return a instanceof Array};z.matches=function(a,b){if(!b||!a||1!==a.nodeType)return!1;var c=a.webkitMatchesSelector||a.mozMatchesSelector||a.oMatchesSelector||a.matchesSelector;if(c)return c.call(a,b);var d,e=a.parentNode,f=!e;return f&&(e=C).appendChild(a),d=~z.qsa(e,b).indexOf(a),f&&C.removeChild(a),d};function F(a){return null==a?String(a):x[y.call(a)]||"object"}function G(a){return"function"==F(a)}function H(a){return null!=a&&a==a.window}function I(a){return null!=a&&a.nodeType==a.DOCUMENT_NODE}function J(a){return"object"==F(a)}function K(a){return J(a)&&!H(a)&&Object.getPrototypeOf(a)==Object.prototype}function L(a){return"number"==typeof a.length}function M(a){return g.call(a,function(a){return null!=a})}function N(a){return a.length>0?c.fn.concat.apply([],a):a}A=function(a){return a.replace(/-+(.)?/g,function(a,b){return b?b.toUpperCase():""})};function O(a){return a.replace(/::/g,"/").replace(/([A-Z]+)([A-Z][a-z])/g,"$1_$2").replace(/([a-z\d])([A-Z])/g,"$1_$2").replace(/_/g,"-").toLowerCase()}B=function(a){return g.call(a,function(b,c){return a.indexOf(b)==c})};function P(a){return a in j?j[a]:j[a]=new RegExp("(^|\\s)"+a+"(\\s|$)")}function Q(a,b){return"number"!=typeof b||k[O(a)]?b:b+"px"}function R(a){var b,c;return i[a]||(b=h.createElement(a),h.body.appendChild(b),c=getComputedStyle(b,"").getPropertyValue("display"),b.parentNode.removeChild(b),"none"==c&&(c="block"),i[a]=c),i[a]}function S(a){return"children"in a?f.call(a.children):c.map(a.childNodes,function(a){return 1==a.nodeType?a:void 0})}z.fragment=function(b,d,e){var g,i,j;return m.test(b)&&(g=c(h.createElement(RegExp.$1))),g||(b.replace&&(b=b.replace(n,"<$1></$2>")),d===a&&(d=l.test(b)&&RegExp.$1),d in u||(d="*"),j=u[d],j.innerHTML=""+b,g=c.each(f.call(j.childNodes),function(){j.removeChild(this)})),K(e)&&(i=c(g),c.each(e,function(a,b){q.indexOf(a)>-1?i[a](b):i.attr(a,b)})),g},z.Z=function(a,b){return a=a||[],a.__proto__=c.fn,a.selector=b||"",a},z.isZ=function(a){return a instanceof z.Z},z.init=function(b,d){var e;if(!b)return z.Z();if("string"==typeof b)if(b=b.trim(),"<"==b[0]&&l.test(b))e=z.fragment(b,RegExp.$1,d),b=null;else{if(d!==a)return c(d).find(b);e=z.qsa(h,b)}else{if(G(b))return c(h).ready(b);if(z.isZ(b))return b;if(E(b))e=M(b);else if(J(b))e=[b],b=null;else if(l.test(b))e=z.fragment(b.trim(),RegExp.$1,d),b=null;else{if(d!==a)return c(d).find(b);e=z.qsa(h,b)}}return z.Z(e,b)},c=function(a,b){return z.init(a,b)};function T(c,d,e){for(b in d)e&&(K(d[b])||E(d[b]))?(K(d[b])&&!K(c[b])&&(c[b]={}),E(d[b])&&!E(c[b])&&(c[b]=[]),T(c[b],d[b],e)):d[b]!==a&&(c[b]=d[b])}c.extend=function(a){var b,c=f.call(arguments,1);return"boolean"==typeof a&&(b=a,a=c.shift()),c.forEach(function(c){T(a,c,b)}),a},z.qsa=function(a,b){var c,d="#"==b[0],e=!d&&"."==b[0],g=d||e?b.slice(1):b,h=w.test(g);return I(a)&&h&&d?(c=a.getElementById(g))?[c]:[]:1!==a.nodeType&&9!==a.nodeType?[]:f.call(h&&!d?e?a.getElementsByClassName(g):a.getElementsByTagName(b):a.querySelectorAll(b))};function U(a,b){return null==b?c(a):c(a).filter(b)}c.contains=h.documentElement.contains?function(a,b){return a!==b&&a.contains(b)}:function(a,b){while(b&&(b=b.parentNode))if(b===a)return!0;return!1};function V(a,b,c,d){return G(b)?b.call(a,c,d):b}function W(a,b,c){null==c?a.removeAttribute(b):a.setAttribute(b,c)}function X(b,c){var d=b.className,e=d&&d.baseVal!==a;return c===a?e?d.baseVal:d:void(e?d.baseVal=c:b.className=c)}function Y(a){var b;try{return a?"true"==a||("false"==a?!1:"null"==a?null:/^0/.test(a)||isNaN(b=Number(a))?/^[\[\{]/.test(a)?c.parseJSON(a):a:b):a}catch(d){return a}}c.type=F,c.isFunction=G,c.isWindow=H,c.isArray=E,c.isPlainObject=K,c.isEmptyObject=function(a){var b;for(b in a)return!1;return!0},c.inArray=function(a,b,c){return e.indexOf.call(b,a,c)},c.camelCase=A,c.trim=function(a){return null==a?"":String.prototype.trim.call(a)},c.uuid=0,c.support={},c.expr={},c.map=function(a,b){var c,d=[],e,f;if(L(a))for(e=0;e<a.length;e++)c=b(a[e],e),null!=c&&d.push(c);else for(f in a)c=b(a[f],f),null!=c&&d.push(c);return N(d)},c.each=function(a,b){var c,d;if(L(a)){for(c=0;c<a.length;c++)if(b.call(a[c],c,a[c])===!1)return a}else for(d in a)if(b.call(a[d],d,a[d])===!1)return a;return a},c.grep=function(a,b){return g.call(a,b)},window.JSON&&(c.parseJSON=JSON.parse),c.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(a,b){x["[object "+b+"]"]=b.toLowerCase()}),c.fn={forEach:e.forEach,reduce:e.reduce,push:e.push,sort:e.sort,indexOf:e.indexOf,concat:e.concat,map:function(a){return c(c.map(this,function(b,c){return a.call(b,c,b)}))},slice:function(){return c(f.apply(this,arguments))},ready:function(a){return v.test(h.readyState)&&h.body?a(c):h.addEventListener("DOMContentLoaded",function(){a(c)},!1),this},get:function(b){return b===a?f.call(this):this[b>=0?b:b+this.length]},toArray:function(){return this.get()},size:function(){return this.length},remove:function(){return this.each(function(){null!=this.parentNode&&this.parentNode.removeChild(this)})},each:function(a){return e.every.call(this,function(b,c){return a.call(b,c,b)!==!1}),this},filter:function(a){return G(a)?this.not(this.not(a)):c(g.call(this,function(b){return z.matches(b,a)}))},add:function(a,b){return c(B(this.concat(c(a,b))))},is:function(a){return this.length>0&&z.matches(this[0],a)},not:function(b){var d=[];if(G(b)&&b.call!==a)this.each(function(a){b.call(this,a)||d.push(this)});else{var e="string"==typeof b?this.filter(b):L(b)&&G(b.item)?f.call(b):c(b);this.forEach(function(a){e.indexOf(a)<0&&d.push(a)})}return c(d)},has:function(a){return this.filter(function(){return J(a)?c.contains(this,a):c(this).find(a).size()})},eq:function(a){return-1===a?this.slice(a):this.slice(a,+a+1)},first:function(){var a=this[0];return a&&!J(a)?a:c(a)},last:function(){var a=this[this.length-1];return a&&!J(a)?a:c(a)},find:function(a){var b,d=this;return b=a?"object"==typeof a?c(a).filter(function(){var a=this;return e.some.call(d,function(b){return c.contains(b,a)})}):1==this.length?c(z.qsa(this[0],a)):this.map(function(){return z.qsa(this,a)}):[]},closest:function(a,b){var d=this[0],e=!1;"object"==typeof a&&(e=c(a));while(d&&!(e?e.indexOf(d)>=0:z.matches(d,a)))d=d!==b&&!I(d)&&d.parentNode;return c(d)},parents:function(a){var b=[],d=this;while(d.length>0)d=c.map(d,function(a){return(a=a.parentNode)&&!I(a)&&b.indexOf(a)<0?(b.push(a),a):void 0});return U(b,a)},parent:function(a){return U(B(this.pluck("parentNode")),a)},children:function(a){return U(this.map(function(){return S(this)}),a)},contents:function(){return this.map(function(){return f.call(this.childNodes)})},siblings:function(a){return U(this.map(function(a,b){return g.call(S(b.parentNode),function(a){return a!==b})}),a)},empty:function(){return this.each(function(){this.innerHTML=""})},pluck:function(a){return c.map(this,function(b){return b[a]})},show:function(){return this.each(function(){"none"==this.style.display&&(this.style.display=""),"none"==getComputedStyle(this,"").getPropertyValue("display")&&(this.style.display=R(this.nodeName))})},replaceWith:function(a){return this.before(a).remove()},wrap:function(a){var b=G(a);if(this[0]&&!b)var d=c(a).get(0),e=d.parentNode||this.length>1;return this.each(function(f){c(this).wrapAll(b?a.call(this,f):e?d.cloneNode(!0):d)})},wrapAll:function(a){if(this[0]){c(this[0]).before(a=c(a));var b;while((b=a.children()).length)a=b.first();c(a).append(this)}return this},wrapInner:function(a){var b=G(a);return this.each(function(d){var e=c(this),f=e.contents(),g=b?a.call(this,d):a;f.length?f.wrapAll(g):e.append(g)})},unwrap:function(){return this.parent().each(function(){c(this).replaceWith(c(this).children())}),this},clone:function(){return this.map(function(){return this.cloneNode(!0)})},hide:function(){return this.css("display","none")},toggle:function(b){return this.each(function(){var d=c(this);(b===a?"none"==d.css("display"):b)?d.show():d.hide()})},prev:function(a){return c(this.pluck("previousElementSibling")).filter(a||"*")},next:function(a){return c(this.pluck("nextElementSibling")).filter(a||"*")},html:function(a){return 0 in arguments?this.each(function(b){var d=this.innerHTML;c(this).empty().append(V(this,a,b,d))}):0 in this?this[0].innerHTML:null},text:function(a){return 0 in arguments?this.each(function(b){var c=V(this,a,b,this.textContent);this.textContent=null==c?"":""+c}):0 in this?this[0].textContent:null},attr:function(c,d){var e;return"string"!=typeof c||1 in arguments?this.each(function(a){if(1===this.nodeType)if(J(c))for(b in c)W(this,b,c[b]);else W(this,c,V(this,d,a,this.getAttribute(c)))}):this.length&&1===this[0].nodeType?!(e=this[0].getAttribute(c))&&c in this[0]?this[0][c]:e:a},removeAttr:function(a){return this.each(function(){1===this.nodeType&&W(this,a)})},prop:function(a,b){return a=D[a]||a,1 in arguments?this.each(function(c){this[a]=V(this,b,c,this[a])}):this[0]&&this[0][a]},data:function(b,c){var d="data-"+b.replace(p,"-$1").toLowerCase(),e=1 in arguments?this.attr(d,c):this.attr(d);return null!==e?Y(e):a},val:function(a){return 0 in arguments?this.each(function(b){this.value=V(this,a,b,this.value)}):this[0]&&(this[0].multiple?c(this[0]).find("option").filter(function(){return this.selected}).pluck("value"):this[0].value)},offset:function(a){if(a)return this.each(function(b){var d=c(this),e=V(this,a,b,d.offset()),f=d.offsetParent().offset(),g={top:e.top-f.top,left:e.left-f.left};"static"==d.css("position")&&(g.position="relative"),d.css(g)});if(!this.length)return null;var b=this[0].getBoundingClientRect();return{left:b.left+window.pageXOffset,top:b.top+window.pageYOffset,width:Math.round(b.width),height:Math.round(b.height)}},css:function(a,d){if(arguments.length<2){var e=this[0],f=getComputedStyle(e,"");if(!e)return;if("string"==typeof a)return e.style[A(a)]||f.getPropertyValue(a);if(E(a)){var g={};return c.each(E(a)?a:[a],function(a,b){g[b]=e.style[A(b)]||f.getPropertyValue(b)}),g}}var h="";if("string"==F(a))d||0===d?h=O(a)+":"+Q(a,d):this.each(function(){this.style.removeProperty(O(a))});else for(b in a)a[b]||0===a[b]?h+=O(b)+":"+Q(b,a[b])+";":this.each(function(){this.style.removeProperty(O(b))});return this.each(function(){this.style.cssText+=";"+h})},index:function(a){return a?this.indexOf(c(a)[0]):this.parent().children().indexOf(this[0])},hasClass:function(a){return a?e.some.call(this,function(a){return this.test(X(a))},P(a)):!1},addClass:function(a){return a?this.each(function(b){d=[];var e=X(this),f=V(this,a,b,e);f.split(/\s+/g).forEach(function(a){c(this).hasClass(a)||d.push(a)},this),d.length&&X(this,e+(e?" ":"")+d.join(" "))}):this},removeClass:function(b){return this.each(function(c){return b===a?X(this,""):(d=X(this),V(this,b,c,d).split(/\s+/g).forEach(function(a){d=d.replace(P(a)," ")}),void X(this,d.trim()))})},toggleClass:function(b,d){return b?this.each(function(e){var f=c(this),g=V(this,b,e,X(this));g.split(/\s+/g).forEach(function(b){(d===a?!f.hasClass(b):d)?f.addClass(b):f.removeClass(b)})}):this},scrollTop:function(b){if(this.length){var c="scrollTop"in this[0];return b===a?c?this[0].scrollTop:this[0].pageYOffset:this.each(c?function(){this.scrollTop=b}:function(){this.scrollTo(this.scrollX,b)})}},scrollLeft:function(b){if(this.length){var c="scrollLeft"in this[0];return b===a?c?this[0].scrollLeft:this[0].pageXOffset:this.each(c?function(){this.scrollLeft=b}:function(){this.scrollTo(b,this.scrollY)})}},position:function(){if(this.length){var a=this[0],b=this.offsetParent(),d=this.offset(),e=o.test(b[0].nodeName)?{top:0,left:0}:b.offset();return d.top-=parseFloat(c(a).css("margin-top"))||0,d.left-=parseFloat(c(a).css("margin-left"))||0,e.top+=parseFloat(c(b[0]).css("border-top-width"))||0,e.left+=parseFloat(c(b[0]).css("border-left-width"))||0,{top:d.top-e.top,left:d.left-e.left}}},offsetParent:function(){return this.map(function(){var a=this.offsetParent||h.body;while(a&&!o.test(a.nodeName)&&"static"==c(a).css("position"))a=a.offsetParent;return a})}},c.fn.detach=c.fn.remove,["width","height"].forEach(function(b){var d=b.replace(/./,function(a){return a[0].toUpperCase()});c.fn[b]=function(e){var f,g=this[0];return e===a?H(g)?g["inner"+d]:I(g)?g.documentElement["scroll"+d]:(f=this.offset())&&f[b]:this.each(function(a){g=c(this),g.css(b,V(this,e,a,g[b]()))})}});function Z(a,b){b(a);for(var c=0,d=a.childNodes.length;d>c;c++)Z(a.childNodes[c],b)}return r.forEach(function(a,b){var d=b%2;c.fn[a]=function(){var a,e=c.map(arguments,function(b){return a=F(b),"object"==a||"array"==a||null==b?b:z.fragment(b)}),f,g=this.length>1;return e.length<1?this:this.each(function(a,i){f=d?i:i.parentNode,i=0==b?i.nextSibling:1==b?i.firstChild:2==b?i:null;var j=c.contains(h.documentElement,f);e.forEach(function(a){if(g)a=a.cloneNode(!0);else if(!f)return c(a).remove();f.insertBefore(a,i),j&&Z(a,function(a){null==a.nodeName||"SCRIPT"!==a.nodeName.toUpperCase()||a.type&&"text/javascript"!==a.type||a.src||window.eval.call(window,a.innerHTML)})})})},c.fn[d?a+"To":"insert"+(b?"Before":"After")]=function(b){return c(b)[a](this),this}}),z.Z.prototype=c.fn,z.uniq=B,z.deserializeValue=Y,c.zepto=z,c}();window.Zepto=Zepto,void 0===window.$&&(window.$=Zepto),function(a){var b=1,c,d=Array.prototype.slice,e=a.isFunction,f=function(a){return"string"==typeof a},g={},h={},i="onfocusin"in window,j={focus:"focusin",blur:"focusout"},k={mouseenter:"mouseover",mouseleave:"mouseout"};h.click=h.mousedown=h.mouseup=h.mousemove="MouseEvents";function l(a){return a._zid||(a._zid=b++)}function m(a,b,c,d){if(b=n(b),b.ns)var e=o(b.ns);return(g[l(a)]||[]).filter(function(a){return!(!a||b.e&&a.e!=b.e||b.ns&&!e.test(a.ns)||c&&l(a.fn)!==l(c)||d&&a.sel!=d)})}function n(a){var b=(""+a).split(".");return{e:b[0],ns:b.slice(1).sort().join(" ")}}function o(a){return new RegExp("(?:^| )"+a.replace(" "," .* ?")+"(?: |$)")}function p(a,b){return a.del&&!i&&a.e in j||!!b}function q(a){return k[a]||i&&j[a]||a}function r(b,d,e,f,h,i,j){var m=l(b),o=g[m]||(g[m]=[]);d.split(/\s/).forEach(function(d){if("ready"==d)return a(document).ready(e);var g=n(d);g.fn=e,g.sel=h,g.e in k&&(e=function(b){var c=b.relatedTarget;return!c||c!==this&&!a.contains(this,c)?g.fn.apply(this,arguments):void 0}),g.del=i;var l=i||e;g.proxy=function(a){if(a=x(a),!a.isImmediatePropagationStopped()){a.data=f;var d=l.apply(b,a._args==c?[a]:[a].concat(a._args));return d===!1&&(a.preventDefault(),a.stopPropagation()),d}},g.i=o.length,o.push(g),"addEventListener"in b&&b.addEventListener(q(g.e),g.proxy,p(g,j))})}function s(a,b,c,d,e){var f=l(a);(b||"").split(/\s/).forEach(function(b){m(a,b,c,d).forEach(function(b){delete g[f][b.i],"removeEventListener"in a&&a.removeEventListener(q(b.e),b.proxy,p(b,e))})})}a.event={add:r,remove:s},a.proxy=function(b,c){var g=2 in arguments&&d.call(arguments,2);if(e(b)){var h=function(){return b.apply(c,g?g.concat(d.call(arguments)):arguments)};return h._zid=l(b),h}if(f(c))return g?(g.unshift(b[c],b),a.proxy.apply(null,g)):a.proxy(b[c],b);throw new TypeError("expected function")},a.fn.bind=function(a,b,c){return this.on(a,b,c)},a.fn.unbind=function(a,b){return this.off(a,b)},a.fn.one=function(a,b,c,d){return this.on(a,b,c,d,1)};var t=function(){return!0},u=function(){return!1},v=/^([A-Z]|returnValue$|layer[XY]$)/,w={preventDefault:"isDefaultPrevented",stopImmediatePropagation:"isImmediatePropagationStopped",stopPropagation:"isPropagationStopped"};function x(b,d){return(d||!b.isDefaultPrevented)&&(d||(d=b),a.each(w,function(a,c){var e=d[a];b[a]=function(){return this[c]=t,e&&e.apply(d,arguments)},b[c]=u}),(d.defaultPrevented!==c?d.defaultPrevented:"returnValue"in d?d.returnValue===!1:d.getPreventDefault&&d.getPreventDefault())&&(b.isDefaultPrevented=t)),b}function y(a){var b,d={originalEvent:a};for(b in a)v.test(b)||a[b]===c||(d[b]=a[b]);return x(d,a)}a.fn.delegate=function(a,b,c){return this.on(b,a,c)},a.fn.undelegate=function(a,b,c){return this.off(b,a,c)},a.fn.live=function(b,c){return a(document.body).delegate(this.selector,b,c),this},a.fn.die=function(b,c){return a(document.body).undelegate(this.selector,b,c),this},a.fn.on=function(b,g,h,i,j){var k,l,m=this;return b&&!f(b)?(a.each(b,function(a,b){m.on(a,g,h,b,j)}),m):(f(g)||e(i)||i===!1||(i=h,h=g,g=c),(e(h)||h===!1)&&(i=h,h=c),i===!1&&(i=u),m.each(function(c,e){j&&(k=function(a){return s(e,a.type,i),i.apply(this,arguments)}),g&&(l=function(b){var c,f=a(b.target).closest(g,e).get(0);return f&&f!==e?(c=a.extend(y(b),{currentTarget:f,liveFired:e}),(k||i).apply(f,[c].concat(d.call(arguments,1)))):void 0}),r(e,b,i,h,g,l||k)}))},a.fn.off=function(b,d,g){var h=this;return b&&!f(b)?(a.each(b,function(a,b){h.off(a,d,b)}),h):(f(d)||e(g)||g===!1||(g=d,d=c),g===!1&&(g=u),h.each(function(){s(this,b,g,d)}))},a.fn.trigger=function(b,c){return b=f(b)||a.isPlainObject(b)?a.Event(b):x(b),b._args=c,this.each(function(){"dispatchEvent"in this?this.dispatchEvent(b):a(this).triggerHandler(b,c)})},a.fn.triggerHandler=function(b,c){var d,e;return this.each(function(g,h){d=y(f(b)?a.Event(b):b),d._args=c,d.target=h,a.each(m(h,b.type||b),function(a,b){return e=b.proxy(d),d.isImmediatePropagationStopped()?!1:void 0})}),e},"focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select keydown keypress keyup error".split(" ").forEach(function(b){a.fn[b]=function(a){return a?this.bind(b,a):this.trigger(b)}}),["focus","blur"].forEach(function(b){a.fn[b]=function(a){return a?this.bind(b,a):this.each(function(){try{this[b]()}catch(a){}}),this}}),a.Event=function(a,b){f(a)||(b=a,a=b.type);var c=document.createEvent(h[a]||"Events"),d=!0;if(b)for(var e in b)"bubbles"==e?d=!!b[e]:c[e]=b[e];return c.initEvent(a,d,!0),x(c)}}(Zepto),function(a){var b=0,c=window.document,d,e,f=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,g=/^(?:text|application)\/javascript/i,h=/^(?:text|application)\/xml/i,i="application/json",j="text/html",k=/^\s*$/;function l(b,c,d){var e=a.Event(c);return a(b).trigger(e,d),!e.isDefaultPrevented()}function m(a,b,d,e){return a.global?l(b||c,d,e):void 0}a.active=0;function n(b){b.global&&0===a.active++&&m(b,null,"ajaxStart")}function o(b){b.global&&!--a.active&&m(b,null,"ajaxStop")}function p(a,b){var c=b.context;return b.beforeSend.call(c,a,b)===!1||m(b,c,"ajaxBeforeSend",[a,b])===!1?!1:void m(b,c,"ajaxSend",[a,b])}function q(a,b,c,d){var e=c.context,f="success";c.success.call(e,a,f,b),d&&d.resolveWith(e,[a,f,b]),m(c,e,"ajaxSuccess",[b,c,a]),s(f,b,c)}function r(a,b,c,d,e){var f=d.context;d.error.call(f,c,b,a),e&&e.rejectWith(f,[c,b,a]),m(d,f,"ajaxError",[c,d,a||b]),s(b,c,d)}function s(a,b,c){var d=c.context;c.complete.call(d,b,a),m(c,d,"ajaxComplete",[b,c]),o(c)}function t(){}a.ajaxJSONP=function(d,e){if(!("type"in d))return a.ajax(d);var f=d.jsonpCallback,g=(a.isFunction(f)?f():f)||"jsonp"+ ++b,h=c.createElement("script"),i=window[g],j,k=function(b){a(h).triggerHandler("error",b||"abort")},l={abort:k},m;return e&&e.promise(l),a(h).on("load error",function(b,c){clearTimeout(m),a(h).off().remove(),"error"!=b.type&&j?q(j[0],l,d,e):r(null,c||"error",l,d,e),window[g]=i,j&&a.isFunction(i)&&i(j[0]),i=j=void 0}),p(l,d)===!1?(k("abort"),l):(window[g]=function(){j=arguments},h.src=d.url.replace(/\?(.+)=\?/,"?$1="+g),c.head.appendChild(h),d.timeout>0&&(m=setTimeout(function(){k("timeout")},d.timeout)),l)},a.ajaxSettings={type:"GET",beforeSend:t,success:t,error:t,complete:t,context:null,global:!0,xhr:function(){return new window.XMLHttpRequest},accepts:{script:"text/javascript, application/javascript, application/x-javascript",json:i,xml:"application/xml, text/xml",html:j,text:"text/plain"},crossDomain:!1,timeout:0,processData:!0,cache:!0};function u(a){return a&&(a=a.split(";",2)[0]),a&&(a==j?"html":a==i?"json":g.test(a)?"script":h.test(a)&&"xml")||"text"}function v(a,b){return""==b?a:(a+"&"+b).replace(/[&?]{1,2}/,"?")}function w(b){b.processData&&b.data&&"string"!=a.type(b.data)&&(b.data=a.param(b.data,b.traditional)),!b.data||b.type&&"GET"!=b.type.toUpperCase()||(b.url=v(b.url,b.data),b.data=void 0)}a.ajax=function(b){var c=a.extend({},b||{}),f=a.Deferred&&a.Deferred();for(d in a.ajaxSettings)void 0===c[d]&&(c[d]=a.ajaxSettings[d]);n(c),c.crossDomain||(c.crossDomain=/^([\w-]+:)?\/\/([^\/]+)/.test(c.url)&&RegExp.$2!=window.location.host),c.url||(c.url=window.location.toString()),w(c);var g=c.dataType,h=/\?.+=\?/.test(c.url);if(h&&(g="jsonp"),c.cache!==!1&&(b&&b.cache===!0||"script"!=g&&"jsonp"!=g)||(c.url=v(c.url,"_="+Date.now())),"jsonp"==g)return h||(c.url=v(c.url,c.jsonp?c.jsonp+"=?":c.jsonp===!1?"":"callback=?")),a.ajaxJSONP(c,f);var i=c.accepts[g],j={},l=function(a,b){j[a.toLowerCase()]=[a,b]},m=/^([\w-]+:)\/\//.test(c.url)?RegExp.$1:window.location.protocol,o=c.xhr(),s=o.setRequestHeader,x;if(f&&f.promise(o),c.crossDomain||l("X-Requested-With","XMLHttpRequest"),l("Accept",i||"*/*"),(i=c.mimeType||i)&&(i.indexOf(",")>-1&&(i=i.split(",",2)[0]),o.overrideMimeType&&o.overrideMimeType(i)),(c.contentType||c.contentType!==!1&&c.data&&"GET"!=c.type.toUpperCase())&&l("Content-Type",c.contentType||"application/x-www-form-urlencoded"),c.headers)for(e in c.headers)l(e,c.headers[e]);if(o.setRequestHeader=l,o.onreadystatechange=function(){if(4==o.readyState){o.onreadystatechange=t,clearTimeout(x);var b,d=!1;if(o.status>=200&&o.status<300||304==o.status||0==o.status&&"file:"==m){g=g||u(c.mimeType||o.getResponseHeader("content-type")),b=o.responseText;try{"script"==g?(1,eval)(b):"xml"==g?b=o.responseXML:"json"==g&&(b=k.test(b)?null:a.parseJSON(b))}catch(e){d=e}d?r(d,"parsererror",o,c,f):q(b,o,c,f)}else r(o.statusText||null,o.status?"error":"abort",o,c,f)}},p(o,c)===!1)return o.abort(),r(null,"abort",o,c,f),o;if(c.xhrFields)for(e in c.xhrFields)o[e]=c.xhrFields[e];var y="async"in c?c.async:!0;o.open(c.type,c.url,y,c.username,c.password);for(e in j)s.apply(o,j[e]);return c.timeout>0&&(x=setTimeout(function(){o.onreadystatechange=t,o.abort(),r(null,"timeout",o,c,f)},c.timeout)),o.send(c.data?c.data:null),o};function x(b,c,d,e){return a.isFunction(c)&&(e=d,d=c,c=void 0),a.isFunction(d)||(e=d,d=void 0),{url:b,data:c,success:d,dataType:e}}a.get=function(){return a.ajax(x.apply(null,arguments))},a.post=function(){var b=x.apply(null,arguments);return b.type="POST",a.ajax(b)},a.getJSON=function(){var b=x.apply(null,arguments);return b.dataType="json",a.ajax(b)},a.fn.load=function(b,c,d){if(!this.length)return this;var e=this,g=b.split(/\s/),h,i=x(b,c,d),j=i.success;return g.length>1&&(i.url=g[0],h=g[1]),i.success=function(b){e.html(h?a("<div>").html(b.replace(f,"")).find(h):b),j&&j.apply(e,arguments)},a.ajax(i),this};var y=encodeURIComponent;function z(b,c,d,e){var f,g=a.isArray(c),h=a.isPlainObject(c);a.each(c,function(c,i){f=a.type(i),e&&(c=d?e:e+"["+(h||"object"==f||"array"==f?c:"")+"]"),!e&&g?b.add(i.name,i.value):"array"==f||!d&&"object"==f?z(b,i,d,c):b.add(c,i)})}a.param=function(a,b){var c=[];return c.add=function(a,b){this.push(y(a)+"="+y(b))},z(c,a,b),c.join("&").replace(/%20/g,"+")}}(Zepto),function(a){a.fn.serializeArray=function(){var b=[],c;return a([].slice.call(this.get(0).elements)).each(function(){c=a(this);var d=c.attr("type");"fieldset"!=this.nodeName.toLowerCase()&&!this.disabled&&"submit"!=d&&"reset"!=d&&"button"!=d&&("radio"!=d&&"checkbox"!=d||this.checked)&&b.push({name:c.attr("name"),value:c.val()})}),b},a.fn.serialize=function(){var a=[];return this.serializeArray().forEach(function(b){a.push(encodeURIComponent(b.name)+"="+encodeURIComponent(b.value))}),a.join("&")},a.fn.submit=function(b){if(b)this.bind("submit",b);else if(this.length){var c=a.Event("submit");this.eq(0).trigger(c),c.isDefaultPrevented()||this.get(0).submit()}return this}}(Zepto),function(a){"__proto__"in{}||a.extend(a.zepto,{Z:function(b,c){return b=b||[],a.extend(b,a.fn),b.selector=c||"",b.__Z=!0,b},isZ:function(b){return"array"===a.type(b)&&"__Z"in b}});try{getComputedStyle(void 0)}catch(b){var c=getComputedStyle;window.getComputedStyle=function(a){try{return c(a)}catch(b){return null}}}}(Zepto),function(a){var b={},c,d,e,f,g=750,h;function i(a,b,c,d){return Math.abs(a-b)>=Math.abs(c-d)?a-b>0?"Left":"Right":c-d>0?"Up":"Down"}function j(){f=null,b.last&&(b.el.trigger("longTap"),b={})}function k(){f&&clearTimeout(f),f=null}function l(){c&&clearTimeout(c),d&&clearTimeout(d),e&&clearTimeout(e),f&&clearTimeout(f),c=d=e=f=null,b={}}function m(a){return"ontouchstart"in window?("touch"==a.pointerType||a.pointerType==a.MSPOINTER_TYPE_TOUCH)&&a.isPrimary:!0}function n(){return"ontouchstart"in window?void 0:!0}function o(a,b){return"ontouchstart"in window?a.type=="pointer"+b||a.type.toLowerCase()=="mspointer"+b:!0}a(document).ready(function(){var p,q,r=0,s=0,t,u,v=n()?"MSPointerDown pointerdown mousedown":"touchstart MSPointerDown pointerdown",w=n()?"MSPointerMove pointermove mousemove":"touchmove MSPointerMove pointermove",x=n()?"MSPointerUp pointerup mouseup":"touchend MSPointerUp pointerup";"MSGesture"in window&&(h=new MSGesture,h.target=document.body),a(document).bind("MSGestureEnd",function(a){var c=a.velocityX>1?"Right":a.velocityX<-1?"Left":a.velocityY>1?"Down":a.velocityY<-1?"Up":null;c&&(b.el.trigger("swipe"),b.el.trigger("swipe"+c))}).on(v,function(d){(!(u=o(d,"down"))||m(d))&&(t=u?d:d.touches[0],d.touches&&1===d.touches.length&&b.x2&&(b.x2=void 0,b.y2=void 0),r=0,s=0,p=Date.now(),q=p-(b.last||p),b.el=a("tagName"in t.target?t.target:t.target.parentNode),c&&clearTimeout(c),b.x1=t.pageX,b.y1=t.pageY,q>0&&250>=q&&(b.isDoubleTap=!0),b.last=p,f=setTimeout(j,g),h&&u&&h.addPointer(d.pointerId))}).on(w,function(a){(!(u=o(a,"move"))||m(a))&&(t=u?a:a.touches[0],k(),b.x2=t.pageX,b.y2=t.pageY,isNaN(r)&&(r=0),isNaN(s)&&(s=0),r+=Math.abs(b.x1-b.x2),s+=Math.abs(b.y1-b.y2),b.el&&b.el.trigger("swipeMove"+i(b.x1,b.x2,b.y1,b.y2),{dx:Math.abs(b.x1-b.x2),dy:Math.abs(b.y1-b.y2)}))}).on(x,function(f){(!(u=o(f,"up"))||m(f))&&(k(),b.x2&&Math.abs(b.x1-b.x2)>30||b.y2&&Math.abs(b.y1-b.y2)>30?e=setTimeout(function(){b.el.trigger("swipe"),b.el.trigger("swipe"+i(b.x1,b.x2,b.y1,b.y2)),b={}},0):"last"in b&&(30>r&&30>s||n()?d=setTimeout(function(){var d=a.Event("tap");d.cancelTouch=l,b.el.trigger(d),b.isDoubleTap?(b.el&&b.el.trigger("doubleTap"),b={}):c=setTimeout(function(){c=null,b.el&&b.el.trigger("singleTap"),b={}},250)},0):b={}),r=s=0)}).on("touchcancel MSPointerCancel pointercancel",l),a(window).on("scroll",l)}),["swipeMoveLeft","swipeMoveRight","swipe","swipeLeft","swipeRight","swipeUp","swipeDown","doubleTap","tap","singleTap","longTap"].forEach(function(b){a.fn[b]=function(a){return this.on(b,a)}})}(Zepto),function(){var a=this,b=a._,c=Array.prototype,d=Object.prototype,e=Function.prototype,f=c.push,g=c.slice,h=c.concat,i=d.toString,j=d.hasOwnProperty,k=Array.isArray,l=Object.keys,m=e.bind,n=function(a){return a instanceof n?a:this instanceof n?void(this._wrapped=a):new n(a)};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=n),exports._=n):a._=n,n.VERSION="1.6.0";var o=function(a,b,c){if(void 0===b)return a;switch(null==c?3:c){case 1:return function(c){return a.call(b,c)};case 2:return function(c,d){return a.call(b,c,d)};case 3:return function(c,d,e){return a.call(b,c,d,e)};case 4:return function(c,d,e,f){return a.call(b,c,d,e,f)}}return function(){return a.apply(b,arguments)}};n.iteratee=function(a,b,c){return null==a?n.identity:n.isFunction(a)?o(a,b,c):n.isObject(a)?n.matches(a):n.property(a)},n.each=n.forEach=function(a,b,c){if(null==a)return a;b=o(b,c);var d,e=a.length;if(e===+e)for(d=0;e>d;d++)b(a[d],d,a);else{var f=n.keys(a);for(d=0,e=f.length;e>d;d++)b(a[f[d]],f[d],a)}return a},n.map=n.collect=function(a,b,c){if(null==a)return[];b=n.iteratee(b,c);for(var d=a.length!==+a.length&&n.keys(a),e=(d||a).length,f=Array(e),g,h=0;e>h;h++)g=d?d[h]:h,f[h]=b(a[g],g,a);return f};var p="Reduce of empty array with no initial value";n.reduce=n.foldl=n.inject=function(a,b,c,d){null==a&&(a=[]),b=o(b,d,4);var e=a.length!==+a.length&&n.keys(a),f=(e||a).length,g=0,h;if(arguments.length<3){if(!f)throw new TypeError(p);c=a[e?e[g++]:g++]}for(;f>g;g++)h=e?e[g]:g,c=b(c,a[h],h,a);return c},n.reduceRight=n.foldr=function(a,b,c,d){null==a&&(a=[]),b=o(b,d,4);var e=a.length!==+a.length&&n.keys(a),f=(e||a).length,g;if(arguments.length<3){if(!f)throw new TypeError(p);c=a[e?e[--f]:--f]}while(f--)g=e?e[f]:f,c=b(c,a[g],g,a);return c},n.find=n.detect=function(a,b,c){var d;return b=n.iteratee(b,c),n.some(a,function(a,c,e){return b(a,c,e)?(d=a,!0):void 0}),d},n.filter=n.select=function(a,b,c){var d=[];return null==a?d:(b=n.iteratee(b,c),n.each(a,function(a,c,e){b(a,c,e)&&d.push(a)}),d)},n.reject=function(a,b,c){return n.filter(a,n.negate(n.iteratee(b)),c)},n.every=n.all=function(a,b,c){if(null==a)return!0;b=n.iteratee(b,c);var d=a.length!==+a.length&&n.keys(a),e=(d||a).length,f,g;for(f=0;e>f;f++)if(g=d?d[f]:f,!b(a[g],g,a))return!1;return!0},n.some=n.any=function(a,b,c){if(null==a)return!1;b=n.iteratee(b,c);var d=a.length!==+a.length&&n.keys(a),e=(d||a).length,f,g;for(f=0;e>f;f++)if(g=d?d[f]:f,b(a[g],g,a))return!0;return!1},n.contains=n.include=function(a,b){return null==a?!1:(a.length!==+a.length&&(a=n.values(a)),n.indexOf(a,b)>=0)},n.invoke=function(a,b){var c=g.call(arguments,2),d=n.isFunction(b);return n.map(a,function(a){return(d?b:a[b]).apply(a,c)})},n.pluck=function(a,b){return n.map(a,n.property(b))},n.where=function(a,b){return n.filter(a,n.matches(b))},n.findWhere=function(a,b){return n.find(a,n.matches(b))},n.max=function(a,b,c){var d=-1/0,e=-1/0,f,g;if(null==b&&null!=a){a=a.length===+a.length?a:n.values(a);for(var h=0,i=a.length;i>h;h++)f=a[h],f>d&&(d=f)}else b=n.iteratee(b,c),n.each(a,function(a,c,f){g=b(a,c,f),(g>e||g===-1/0&&d===-1/0)&&(d=a,e=g)});return d},n.min=function(a,b,c){var d=1/0,e=1/0,f,g;if(null==b&&null!=a){a=a.length===+a.length?a:n.values(a);for(var h=0,i=a.length;i>h;h++)f=a[h],d>f&&(d=f)}else b=n.iteratee(b,c),n.each(a,function(a,c,f){g=b(a,c,f),(e>g||1/0===g&&1/0===d)&&(d=a,e=g)});return d},n.shuffle=function(a){for(var b=a&&a.length===+a.length?a:n.values(a),c=b.length,d=Array(c),e=0,f;c>e;e++)f=n.random(0,e),f!==e&&(d[e]=d[f]),d[f]=b[e];return d},n.sample=function(a,b,c){return null==b||c?(a.length!==+a.length&&(a=n.values(a)),a[n.random(a.length-1)]):n.shuffle(a).slice(0,Math.max(0,b))},n.sortBy=function(a,b,c){return b=n.iteratee(b,c),n.pluck(n.map(a,function(a,c,d){return{value:a,index:c,criteria:b(a,c,d)}}).sort(function(a,b){var c=a.criteria,d=b.criteria;if(c!==d){if(c>d||void 0===c)return 1;if(d>c||void 0===d)return-1}return a.index-b.index}),"value")};var q=function(a){return function(b,c,d){var e={};return c=n.iteratee(c,d),n.each(b,function(d,f){var g=c(d,f,b);a(e,d,g)}),e}};n.groupBy=q(function(a,b,c){n.has(a,c)?a[c].push(b):a[c]=[b]}),n.indexBy=q(function(a,b,c){a[c]=b}),n.countBy=q(function(a,b,c){n.has(a,c)?a[c]++:a[c]=1}),n.sortedIndex=function(a,b,c,d){c=n.iteratee(c,d,1);var e=c(b),f=0,g=a.length;while(g>f){var h=f+g>>>1;c(a[h])<e?f=h+1:g=h}return f},n.toArray=function(a){return a?n.isArray(a)?g.call(a):a.length===+a.length?n.map(a,n.identity):n.values(a):[]},n.size=function(a){return null==a?0:a.length===+a.length?a.length:n.keys(a).length
},n.partition=function(a,b,c){b=n.iteratee(b,c);var d=[],e=[];return n.each(a,function(a,c,f){(b(a,c,f)?d:e).push(a)}),[d,e]},n.first=n.head=n.take=function(a,b,c){return null==a?void 0:null==b||c?a[0]:0>b?[]:g.call(a,0,b)},n.initial=function(a,b,c){return g.call(a,0,Math.max(0,a.length-(null==b||c?1:b)))},n.last=function(a,b,c){return null==a?void 0:null==b||c?a[a.length-1]:g.call(a,Math.max(a.length-b,0))},n.rest=n.tail=n.drop=function(a,b,c){return g.call(a,null==b||c?1:b)},n.compact=function(a){return n.filter(a,n.identity)};var r=function(a,b,c,d){if(b&&n.every(a,n.isArray))return h.apply(d,a);for(var e=0,g=a.length;g>e;e++){var i=a[e];n.isArray(i)||n.isArguments(i)?b?f.apply(d,i):r(i,b,c,d):c||d.push(i)}return d};n.flatten=function(a,b){return r(a,b,!1,[])},n.without=function(a){return n.difference(a,g.call(arguments,1))},n.uniq=n.unique=function(a,b,c,d){if(null==a)return[];n.isBoolean(b)||(d=c,c=b,b=!1),null!=c&&(c=n.iteratee(c,d));for(var e=[],f=[],g=0,h=a.length;h>g;g++){var i=a[g];if(b)g&&f===i||e.push(i),f=i;else if(c){var j=c(i,g,a);n.indexOf(f,j)<0&&(f.push(j),e.push(i))}else n.indexOf(e,i)<0&&e.push(i)}return e},n.union=function(){return n.uniq(r(arguments,!0,!0,[]))},n.intersection=function(a){if(null==a)return[];for(var b=[],c=arguments.length,d=0,e=a.length;e>d;d++){var f=a[d];if(!n.contains(b,f)){for(var g=1;c>g;g++)if(!n.contains(arguments[g],f))break;g===c&&b.push(f)}}return b},n.difference=function(a){var b=r(g.call(arguments,1),!0,!0,[]);return n.filter(a,function(a){return!n.contains(b,a)})},n.zip=function(a){if(null==a)return[];for(var b=n.max(arguments,"length").length,c=Array(b),d=0;b>d;d++)c[d]=n.pluck(arguments,d);return c},n.object=function(a,b){if(null==a)return{};for(var c={},d=0,e=a.length;e>d;d++)b?c[a[d]]=b[d]:c[a[d][0]]=a[d][1];return c},n.indexOf=function(a,b,c){if(null==a)return-1;var d=0,e=a.length;if(c){if("number"!=typeof c)return d=n.sortedIndex(a,b),a[d]===b?d:-1;d=0>c?Math.max(0,e+c):c}for(;e>d;d++)if(a[d]===b)return d;return-1},n.lastIndexOf=function(a,b,c){if(null==a)return-1;var d=a.length;"number"==typeof c&&(d=0>c?d+c+1:Math.min(d,c+1));while(--d>=0)if(a[d]===b)return d;return-1},n.range=function(a,b,c){arguments.length<=1&&(b=a||0,a=0),c=c||1;for(var d=Math.max(Math.ceil((b-a)/c),0),e=Array(d),f=0;d>f;f++,a+=c)e[f]=a;return e};var s=function(){};n.bind=function(a,b){var c,d;if(m&&a.bind===m)return m.apply(a,g.call(arguments,1));if(!n.isFunction(a))throw new TypeError("Bind must be called on a function");return c=g.call(arguments,2),d=function(){if(!(this instanceof d))return a.apply(b,c.concat(g.call(arguments)));s.prototype=a.prototype;var e=new s;s.prototype=null;var f=a.apply(e,c.concat(g.call(arguments)));return n.isObject(f)?f:e}},n.partial=function(a){var b=g.call(arguments,1);return function(){for(var c=0,d=b.slice(),e=0,f=d.length;f>e;e++)d[e]===n&&(d[e]=arguments[c++]);while(c<arguments.length)d.push(arguments[c++]);return a.apply(this,d)}},n.bindAll=function(a){var b,c=arguments.length,d;if(1>=c)throw new Error("bindAll must be passed function names");for(b=1;c>b;b++)d=arguments[b],a[d]=n.bind(a[d],a);return a},n.memoize=function(a,b){var c=function(d){var e=c.cache,f=b?b.apply(this,arguments):d;return n.has(e,f)||(e[f]=a.apply(this,arguments)),e[f]};return c.cache={},c},n.delay=function(a,b){var c=g.call(arguments,2);return setTimeout(function(){return a.apply(null,c)},b)},n.defer=function(a){return n.delay.apply(n,[a,1].concat(g.call(arguments,1)))},n.throttle=function(a,b,c){var d,e,f,g=null,h=0;c||(c={});var i=function(){h=c.leading===!1?0:n.now(),g=null,f=a.apply(d,e),g||(d=e=null)};return function(){var j=n.now();h||c.leading!==!1||(h=j);var k=b-(j-h);return d=this,e=arguments,0>=k||k>b?(clearTimeout(g),g=null,h=j,f=a.apply(d,e),g||(d=e=null)):g||c.trailing===!1||(g=setTimeout(i,k)),f}},n.debounce=function(a,b,c){var d,e,f,g,h,i=function(){var j=n.now()-g;b>j&&j>0?d=setTimeout(i,b-j):(d=null,c||(h=a.apply(f,e),d||(f=e=null)))};return function(){f=this,e=arguments,g=n.now();var j=c&&!d;return d||(d=setTimeout(i,b)),j&&(h=a.apply(f,e),f=e=null),h}},n.wrap=function(a,b){return n.partial(b,a)},n.negate=function(a){return function(){return!a.apply(this,arguments)}},n.compose=function(){var a=arguments,b=a.length-1;return function(){var c=b,d=a[b].apply(this,arguments);while(c--)d=a[c].call(this,d);return d}},n.after=function(a,b){return function(){return--a<1?b.apply(this,arguments):void 0}},n.before=function(a,b){var c;return function(){return--a>0?c=b.apply(this,arguments):b=null,c}},n.once=n.partial(n.before,2),n.keys=function(a){if(!n.isObject(a))return[];if(l)return l(a);var b=[];for(var c in a)n.has(a,c)&&b.push(c);return b},n.values=function(a){for(var b=n.keys(a),c=b.length,d=Array(c),e=0;c>e;e++)d[e]=a[b[e]];return d},n.pairs=function(a){for(var b=n.keys(a),c=b.length,d=Array(c),e=0;c>e;e++)d[e]=[b[e],a[b[e]]];return d},n.invert=function(a){for(var b={},c=n.keys(a),d=0,e=c.length;e>d;d++)b[a[c[d]]]=c[d];return b},n.functions=n.methods=function(a){var b=[];for(var c in a)n.isFunction(a[c])&&b.push(c);return b.sort()},n.extend=function(a){if(!n.isObject(a))return a;for(var b,c,d=1,e=arguments.length;e>d;d++){b=arguments[d];for(c in b)j.call(b,c)&&(a[c]=b[c])}return a},n.pick=function(a,b,c){var d={},e;if(null==a)return d;if(n.isFunction(b)){b=o(b,c);for(e in a){var f=a[e];b(f,e,a)&&(d[e]=f)}}else{var i=h.apply([],g.call(arguments,1));a=new Object(a);for(var j=0,k=i.length;k>j;j++)e=i[j],e in a&&(d[e]=a[e])}return d},n.omit=function(a,b,c){if(n.isFunction(b))b=n.negate(b);else{var d=n.map(h.apply([],g.call(arguments,1)),String);b=function(a,b){return!n.contains(d,b)}}return n.pick(a,b,c)},n.defaults=function(a){if(!n.isObject(a))return a;for(var b=1,c=arguments.length;c>b;b++){var d=arguments[b];for(var e in d)void 0===a[e]&&(a[e]=d[e])}return a},n.clone=function(a){return n.isObject(a)?n.isArray(a)?a.slice():n.extend({},a):a},n.tap=function(a,b){return b(a),a};var t=function(a,b,c,d){if(a===b)return 0!==a||1/a===1/b;if(null==a||null==b)return a===b;a instanceof n&&(a=a._wrapped),b instanceof n&&(b=b._wrapped);var e=i.call(a);if(e!==i.call(b))return!1;switch(e){case"[object RegExp]":case"[object String]":return""+a==""+b;case"[object Number]":return+a!==+a?+b!==+b:0===+a?1/+a===1/b:+a===+b;case"[object Date]":case"[object Boolean]":return+a===+b}if("object"!=typeof a||"object"!=typeof b)return!1;var f=c.length;while(f--)if(c[f]===a)return d[f]===b;var g=a.constructor,h=b.constructor;if(g!==h&&"constructor"in a&&"constructor"in b&&!(n.isFunction(g)&&g instanceof g&&n.isFunction(h)&&h instanceof h))return!1;c.push(a),d.push(b);var j,k;if("[object Array]"===e){if(j=a.length,k=j===b.length)while(j--)if(!(k=t(a[j],b[j],c,d)))break}else{var l=n.keys(a),m;if(j=l.length,k=n.keys(b).length===j)while(j--)if(m=l[j],!(k=n.has(b,m)&&t(a[m],b[m],c,d)))break}return c.pop(),d.pop(),k};n.isEqual=function(a,b){return t(a,b,[],[])},n.isEmpty=function(a){if(null==a)return!0;if(n.isArray(a)||n.isString(a)||n.isArguments(a))return 0===a.length;for(var b in a)if(n.has(a,b))return!1;return!0},n.isElement=function(a){return!(!a||1!==a.nodeType)},n.isArray=k||function(a){return"[object Array]"===i.call(a)},n.isObject=function(a){var b=typeof a;return"function"===b||"object"===b&&!!a},n.each(["Arguments","Function","String","Number","Date","RegExp"],function(a){n["is"+a]=function(b){return i.call(b)==="[object "+a+"]"}}),n.isArguments(arguments)||(n.isArguments=function(a){return n.has(a,"callee")}),"function"!=typeof/./&&(n.isFunction=function(a){return"function"==typeof a||!1}),n.isFinite=function(a){return isFinite(a)&&!isNaN(parseFloat(a))},n.isNaN=function(a){return n.isNumber(a)&&a!==+a},n.isBoolean=function(a){return a===!0||a===!1||"[object Boolean]"===i.call(a)},n.isNull=function(a){return null===a},n.isUndefined=function(a){return void 0===a},n.has=function(a,b){return null!=a&&j.call(a,b)},n.noConflict=function(){return a._=b,this},n.identity=function(a){return a},n.constant=function(a){return function(){return a}},n.noop=function(){},n.property=function(a){return function(b){return b[a]}},n.matches=function(a){var b=n.pairs(a),c=b.length;return function(a){if(null==a)return!c;a=new Object(a);for(var d=0;c>d;d++){var e=b[d],f=e[0];if(e[1]!==a[f]||!(f in a))return!1}return!0}},n.times=function(a,b,c){var d=Array(Math.max(0,a));b=o(b,c,1);for(var e=0;a>e;e++)d[e]=b(e);return d},n.random=function(a,b){return null==b&&(b=a,a=0),a+Math.floor(Math.random()*(b-a+1))},n.now=Date.now||function(){return(new Date).getTime()};var u={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},v=n.invert(u),w=function(a){var b=function(b){return a[b]},c="(?:"+n.keys(a).join("|")+")",d=RegExp(c),e=RegExp(c,"g");return function(a){return a=null==a?"":""+a,d.test(a)?a.replace(e,b):a}};n.escape=w(u),n.unescape=w(v),n.result=function(a,b){if(null==a)return void 0;var c=a[b];return n.isFunction(c)?a[b]():c};var x=0;n.uniqueId=function(a){var b=++x+"";return a?a+b:b},n.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var y=/(.)^/,z={"'":"'","\\":"\\","\r":"r","\n":"n","\u2028":"u2028","\u2029":"u2029"},A=/\\|'|\r|\n|\u2028|\u2029/g,B=function(a){return"\\"+z[a]};n.template=function(a,b,c){!b&&c&&(b=c),b=n.defaults({},b,n.templateSettings);var d=RegExp([(b.escape||y).source,(b.interpolate||y).source,(b.evaluate||y).source].join("|")+"|$","g"),e=0,f="__p+='";a.replace(d,function(b,c,d,g,h){return f+=a.slice(e,h).replace(A,B),e=h+b.length,c?f+="'+\n((__t=("+c+"))==null?'':_.escape(__t))+\n'":d?f+="'+\n((__t=("+d+"))==null?'':__t)+\n'":g&&(f+="';\n"+g+"\n__p+='"),b}),f+="';\n",b.variable||(f="with(obj||{}){\n"+f+"}\n"),f="var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n"+f+"return __p;\n";try{var g=new Function(b.variable||"obj","_",f)}catch(h){throw h.source=f,h}var i=function(a){return g.call(this,a,n)},j=b.variable||"obj";return i.source="function("+j+"){\n"+f+"}",i},n.chain=function(a){var b=n(a);return b._chain=!0,b};var C=function(a){return this._chain?n(a).chain():a};n.mixin=function(a){n.each(n.functions(a),function(b){var c=n[b]=a[b];n.prototype[b]=function(){var a=[this._wrapped];return f.apply(a,arguments),C.call(this,c.apply(n,a))}})},n.mixin(n),n.each(["pop","push","reverse","shift","sort","splice","unshift"],function(a){var b=c[a];n.prototype[a]=function(){var c=this._wrapped;return b.apply(c,arguments),"shift"!==a&&"splice"!==a||0!==c.length||delete c[0],C.call(this,c)}}),n.each(["concat","join","slice"],function(a){var b=c[a];n.prototype[a]=function(){return C.call(this,b.apply(this._wrapped,arguments))}}),n.prototype.value=function(){return this._wrapped},"function"==typeof define&&define.amd&&define("underscore",[],function(){return n})}.call(this),function(a,b){if("function"==typeof define&&define.amd)define(["underscore","jquery","exports"],function(c,d,e){a.Backbone=b(a,e,c,d)});else if("undefined"!=typeof exports){var c=require("underscore");b(a,exports,c)}else a.Backbone=b(a,{},a._,a.jQuery||a.Zepto||a.ender||a.$)}(this,function(a,b,c,d){var e=a.Backbone,f=[],g=f.slice;b.VERSION="1.1.2",b.$=d,b.noConflict=function(){return a.Backbone=e,this},b.emulateHTTP=!1,b.emulateJSON=!1;var h=b.Events={on:function(a,b,c){if(!j(this,"on",a,[b,c])||!b)return this;this._events||(this._events={});var d=this._events[a]||(this._events[a]=[]);return d.push({callback:b,context:c,ctx:c||this}),this},once:function(a,b,d){if(!j(this,"once",a,[b,d])||!b)return this;var e=this,f=c.once(function(){e.off(a,f),b.apply(this,arguments)});return f._callback=b,this.on(a,f,d)},off:function(a,b,d){if(!this._events||!j(this,"off",a,[b,d]))return this;if(!a&&!b&&!d)return this._events=void 0,this;for(var e=a?[a]:c.keys(this._events),f=0,g=e.length;g>f;f++){a=e[f];var h=this._events[a];if(h)if(b||d){for(var i=[],k=0,l=h.length;l>k;k++){var m=h[k];(b&&b!==m.callback&&b!==m.callback._callback||d&&d!==m.context)&&i.push(m)}i.length?this._events[a]=i:delete this._events[a]}else delete this._events[a]}return this},trigger:function(a){if(!this._events)return this;var b=g.call(arguments,1);if(!j(this,"trigger",a,b))return this;var c=this._events[a],d=this._events.all;return c&&k(c,b),d&&k(d,arguments),this},stopListening:function(a,b,d){var e=this._listeningTo;if(!e)return this;var f=!b&&!d;d||"object"!=typeof b||(d=this),a&&((e={})[a._listenId]=a);for(var g in e)a=e[g],a.off(b,d,this),(f||c.isEmpty(a._events))&&delete this._listeningTo[g];return this}},i=/\s+/,j=function(a,b,c,d){if(!c)return!0;if("object"==typeof c){for(var e in c)a[b].apply(a,[e,c[e]].concat(d));return!1}if(i.test(c)){for(var f=c.split(i),g=0,h=f.length;h>g;g++)a[b].apply(a,[f[g]].concat(d));return!1}return!0},k=function(a,b){var c,d=-1,e=a.length,f=b[0],g=b[1],h=b[2];switch(b.length){case 0:while(++d<e)(c=a[d]).callback.call(c.ctx);return;case 1:while(++d<e)(c=a[d]).callback.call(c.ctx,f);return;case 2:while(++d<e)(c=a[d]).callback.call(c.ctx,f,g);return;case 3:while(++d<e)(c=a[d]).callback.call(c.ctx,f,g,h);return;default:while(++d<e)(c=a[d]).callback.apply(c.ctx,b);return}},l={listenTo:"on",listenToOnce:"once"};c.each(l,function(a,b){h[b]=function(b,d,e){var f=this._listeningTo||(this._listeningTo={}),g=b._listenId||(b._listenId=c.uniqueId("l"));return f[g]=b,e||"object"!=typeof d||(e=this),b[a](d,e,this),this}}),h.bind=h.on,h.unbind=h.off,c.extend(b,h);var m=b.Model=function(a,b){var d=a||{};b||(b={}),this.cid=c.uniqueId("c"),this.attributes={},b.collection&&(this.collection=b.collection),b.parse&&(d=this.parse(d,b)||{}),d=c.defaults({},d,c.result(this,"defaults")),this.set(d,b),this.changed={},this.initialize.apply(this,arguments)};c.extend(m.prototype,h,{changed:null,validationError:null,idAttribute:"id",initialize:function(){},toJSON:function(a){return c.clone(this.attributes)},sync:function(){return b.sync.apply(this,arguments)},get:function(a){return this.attributes[a]},escape:function(a){return c.escape(this.get(a))},has:function(a){return null!=this.get(a)},set:function(a,b,d){var e,f,g,h,i,j,k,l;if(null==a)return this;if("object"==typeof a?(f=a,d=b):(f={})[a]=b,d||(d={}),!this._validate(f,d))return!1;g=d.unset,i=d.silent,h=[],j=this._changing,this._changing=!0,j||(this._previousAttributes=c.clone(this.attributes),this.changed={}),l=this.attributes,k=this._previousAttributes,this.idAttribute in f&&(this.id=f[this.idAttribute]);for(e in f)b=f[e],c.isEqual(l[e],b)||h.push(e),c.isEqual(k[e],b)?delete this.changed[e]:this.changed[e]=b,g?delete l[e]:l[e]=b;if(!i){h.length&&(this._pending=d);for(var m=0,n=h.length;n>m;m++)this.trigger("change:"+h[m],this,l[h[m]],d)}if(j)return this;if(!i)while(this._pending)d=this._pending,this._pending=!1,this.trigger("change",this,d);return this._pending=!1,this._changing=!1,this},unset:function(a,b){return this.set(a,void 0,c.extend({},b,{unset:!0}))},clear:function(a){var b={};for(var d in this.attributes)b[d]=void 0;return this.set(b,c.extend({},a,{unset:!0}))},hasChanged:function(a){return null==a?!c.isEmpty(this.changed):c.has(this.changed,a)},changedAttributes:function(a){if(!a)return this.hasChanged()?c.clone(this.changed):!1;var b,d=!1,e=this._changing?this._previousAttributes:this.attributes;for(var f in a)c.isEqual(e[f],b=a[f])||((d||(d={}))[f]=b);return d},previous:function(a){return null!=a&&this._previousAttributes?this._previousAttributes[a]:null},previousAttributes:function(){return c.clone(this._previousAttributes)},fetch:function(a){a=a?c.clone(a):{},void 0===a.parse&&(a.parse=!0);var b=this,d=a.success;return a.success=function(c){return b.set(b.parse(c,a),a)?(d&&d(b,c,a),void b.trigger("sync",b,c,a)):!1},I(this,a),this.sync("read",this,a)},save:function(a,b,d){var e,f,g,h=this.attributes;if(null==a||"object"==typeof a?(e=a,d=b):(e={})[a]=b,d=c.extend({validate:!0},d),e&&!d.wait){if(!this.set(e,d))return!1}else if(!this._validate(e,d))return!1;e&&d.wait&&(this.attributes=c.extend({},h,e)),void 0===d.parse&&(d.parse=!0);var i=this,j=d.success;return d.success=function(a){i.attributes=h;var b=i.parse(a,d);return d.wait&&(b=c.extend(e||{},b)),c.isObject(b)&&!i.set(b,d)?!1:(j&&j(i,a,d),void i.trigger("sync",i,a,d))},I(this,d),f=this.isNew()?"create":d.patch?"patch":"update","patch"!==f||d.attrs||(d.attrs=e),g=this.sync(f,this,d),e&&d.wait&&(this.attributes=h),g},destroy:function(a){a=a?c.clone(a):{};var b=this,d=a.success,e=function(){b.stopListening(),b.trigger("destroy",b,b.collection,a)};if(a.success=function(c){(a.wait||b.isNew())&&e(),d&&d(b,c,a),b.isNew()||b.trigger("sync",b,c,a)},this.isNew())return a.success(),!1;I(this,a);var f=this.sync("delete",this,a);return a.wait||e(),f},url:function(){var a=c.result(this,"urlRoot")||c.result(this.collection,"url")||H();return this.isNew()?a:a.replace(/([^\/])$/,"$1/")+encodeURIComponent(this.id)},parse:function(a,b){return a},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return!this.has(this.idAttribute)},isValid:function(a){return this._validate({},c.extend(a||{},{validate:!0}))},_validate:function(a,b){if(!b.validate||!this.validate)return!0;a=c.extend({},this.attributes,a);var d=this.validationError=this.validate(a,b)||null;return d?(this.trigger("invalid",this,d,c.extend(b,{validationError:d})),!1):!0}});var n=["keys","values","pairs","invert","pick","omit","chain"];c.each(n,function(a){c[a]&&(m.prototype[a]=function(){var b=g.call(arguments);return b.unshift(this.attributes),c[a].apply(c,b)})});var o=b.Collection=function(a,b){b||(b={}),b.model&&(this.model=b.model),void 0!==b.comparator&&(this.comparator=b.comparator),this._reset(),this.initialize.apply(this,arguments),a&&this.reset(a,c.extend({silent:!0},b))},p={add:!0,remove:!0,merge:!0},q={add:!0,remove:!1};c.extend(o.prototype,h,{model:m,initialize:function(){},toJSON:function(a){return this.map(function(b){return b.toJSON(a)})},sync:function(){return b.sync.apply(this,arguments)},add:function(a,b){return this.set(a,c.extend({merge:!1},b,q))},remove:function(a,b){var d=!c.isArray(a);a=d?[a]:c.clone(a),b||(b={});for(var e=0,f=a.length;f>e;e++){var g=a[e]=this.get(a[e]);if(g){var h=this.modelId(g.attributes);null!=h&&delete this._byId[h],delete this._byId[g.cid];var i=this.indexOf(g);this.models.splice(i,1),this.length--,b.silent||(b.index=i,g.trigger("remove",g,this,b)),this._removeReference(g,b)}}return d?a[0]:a},set:function(a,b){b=c.defaults({},b,p),b.parse&&(a=this.parse(a,b));var d=!c.isArray(a);a=d?a?[a]:[]:a.slice();for(var e,f,g,h,i,j=b.at,k=this.comparator&&null==j&&b.sort!==!1,l=c.isString(this.comparator)?this.comparator:null,m=[],n=[],o={},q=b.add,r=b.merge,s=b.remove,t=!k&&q&&s?[]:!1,u=0,v=a.length;v>u;u++){if(g=a[u],h=this.get(g))s&&(o[h.cid]=!0),r&&g!==h&&(g=this._isModel(g)?g.attributes:g,b.parse&&(g=h.parse(g,b)),h.set(g,b),k&&!i&&h.hasChanged(l)&&(i=!0)),a[u]=h;else if(q){if(f=a[u]=this._prepareModel(g,b),!f)continue;m.push(f),this._addReference(f,b)}f=h||f,f&&(e=this.modelId(f.attributes),!t||!f.isNew()&&o[e]||t.push(f),o[e]=!0)}if(s){for(var u=0,v=this.length;v>u;u++)o[(f=this.models[u]).cid]||n.push(f);n.length&&this.remove(n,b)}if(m.length||t&&t.length)if(k&&(i=!0),this.length+=m.length,null!=j)for(var u=0,v=m.length;v>u;u++)this.models.splice(j+u,0,m[u]);else{t&&(this.models.length=0);for(var w=t||m,u=0,v=w.length;v>u;u++)this.models.push(w[u])}if(i&&this.sort({silent:!0}),!b.silent){for(var u=0,v=m.length;v>u;u++)(f=m[u]).trigger("add",f,this,b);(i||t&&t.length)&&this.trigger("sort",this,b)}return d?a[0]:a},reset:function(a,b){b||(b={});for(var d=0,e=this.models.length;e>d;d++)this._removeReference(this.models[d],b);return b.previousModels=this.models,this._reset(),a=this.add(a,c.extend({silent:!0},b)),b.silent||this.trigger("reset",this,b),a},push:function(a,b){return this.add(a,c.extend({at:this.length},b))},pop:function(a){var b=this.at(this.length-1);return this.remove(b,a),b},unshift:function(a,b){return this.add(a,c.extend({at:0},b))},shift:function(a){var b=this.at(0);return this.remove(b,a),b},slice:function(){return g.apply(this.models,arguments)},get:function(a){if(null==a)return void 0;var b=this.modelId(this._isModel(a)?a.attributes:a);return this._byId[a]||this._byId[b]||this._byId[a.cid]},at:function(a){return this.models[a]},where:function(a,b){return c.isEmpty(a)?b?void 0:[]:this[b?"find":"filter"](function(b){for(var c in a)if(a[c]!==b.get(c))return!1;return!0})},findWhere:function(a){return this.where(a,!0)},sort:function(a){if(!this.comparator)throw new Error("Cannot sort a set without a comparator");return a||(a={}),c.isString(this.comparator)||1===this.comparator.length?this.models=this.sortBy(this.comparator,this):this.models.sort(c.bind(this.comparator,this)),a.silent||this.trigger("sort",this,a),this},pluck:function(a){return c.invoke(this.models,"get",a)},fetch:function(a){a=a?c.clone(a):{},void 0===a.parse&&(a.parse=!0);var b=a.success,d=this;return a.success=function(c){var e=a.reset?"reset":"set";d[e](c,a),b&&b(d,c,a),d.trigger("sync",d,c,a)},I(this,a),this.sync("read",this,a)},create:function(a,b){if(b=b?c.clone(b):{},!(a=this._prepareModel(a,b)))return!1;b.wait||this.add(a,b);var d=this,e=b.success;return b.success=function(a,c){b.wait&&d.add(a,b),e&&e(a,c,b)},a.save(null,b),a},parse:function(a,b){return a},clone:function(){return new this.constructor(this.models,{model:this.model,comparator:this.comparator})},modelId:function(a){return a[this.model.prototype.idAttribute||"id"]},_reset:function(){this.length=0,this.models=[],this._byId={}},_prepareModel:function(a,b){if(this._isModel(a))return a.collection||(a.collection=this),a;b=b?c.clone(b):{},b.collection=this;var d=new this.model(a,b);return d.validationError?(this.trigger("invalid",this,d.validationError,b),!1):d},_isModel:function(a){return a instanceof m},_addReference:function(a,b){this._byId[a.cid]=a;var c=this.modelId(a.attributes);null!=c&&(this._byId[c]=a),a.on("all",this._onModelEvent,this)},_removeReference:function(a,b){this===a.collection&&delete a.collection,a.off("all",this._onModelEvent,this)},_onModelEvent:function(a,b,c,d){if("add"!==a&&"remove"!==a||c===this){if("destroy"===a&&this.remove(b,d),"change"===a){var e=this.modelId(b.previousAttributes()),f=this.modelId(b.attributes);e!==f&&(null!=e&&delete this._byId[e],null!=f&&(this._byId[f]=b))}this.trigger.apply(this,arguments)}}});var r=["forEach","each","map","collect","reduce","foldl","inject","reduceRight","foldr","find","detect","filter","select","reject","every","all","some","any","include","contains","invoke","max","min","toArray","size","first","head","take","initial","rest","tail","drop","last","without","difference","indexOf","shuffle","lastIndexOf","isEmpty","chain","sample","partition"];c.each(r,function(a){c[a]&&(o.prototype[a]=function(){var b=g.call(arguments);return b.unshift(this.models),c[a].apply(c,b)})});var s=["groupBy","countBy","sortBy","indexBy"];c.each(s,function(a){c[a]&&(o.prototype[a]=function(b,d){var e=c.isFunction(b)?b:function(a){return a.get(b)};return c[a](this.models,e,d)})});var t=b.View=function(a){this.cid=c.uniqueId("view"),a||(a={}),c.extend(this,c.pick(a,v)),this._ensureElement(),this.initialize.apply(this,arguments)},u=/^(\S+)\s*(.*)$/,v=["model","collection","el","id","attributes","className","tagName","events"];c.extend(t.prototype,h,{tagName:"div",$:function(a){return this.$el.find(a)},initialize:function(){},render:function(){return this},remove:function(){return this._removeElement(),this.stopListening(),this},_removeElement:function(){this.$el.remove()},setElement:function(a){return this.undelegateEvents(),this._setElement(a),this.delegateEvents(),this},_setElement:function(a){this.$el=a instanceof b.$?a:b.$(a),this.el=this.$el[0]},delegateEvents:function(a){if(!a&&!(a=c.result(this,"events")))return this;this.undelegateEvents();for(var b in a){var d=a[b];if(c.isFunction(d)||(d=this[a[b]]),d){var e=b.match(u);this.delegate(e[1],e[2],c.bind(d,this))}}return this},delegate:function(a,b,c){this.$el.on(a+".delegateEvents"+this.cid,b,c)},undelegateEvents:function(){return this.$el&&this.$el.off(".delegateEvents"+this.cid),this},undelegate:function(a,b,c){this.$el.off(a+".delegateEvents"+this.cid,b,c)},_createElement:function(a){return document.createElement(a)},_ensureElement:function(){if(this.el)this.setElement(c.result(this,"el"));else{var a=c.extend({},c.result(this,"attributes"));this.id&&(a.id=c.result(this,"id")),this.className&&(a["class"]=c.result(this,"className")),this.setElement(this._createElement(c.result(this,"tagName"))),this._setAttributes(a)}},_setAttributes:function(a){this.$el.attr(a)}}),b.sync=function(a,d,e){var f=w[a];c.defaults(e||(e={}),{emulateHTTP:b.emulateHTTP,emulateJSON:b.emulateJSON});var g={type:f,dataType:"json"};if(e.url||(g.url=c.result(d,"url")||H()),null!=e.data||!d||"create"!==a&&"update"!==a&&"patch"!==a||(g.contentType="application/json",g.data=JSON.stringify(e.attrs||d.toJSON(e))),e.emulateJSON&&(g.contentType="application/x-www-form-urlencoded",g.data=g.data?{model:g.data}:{}),e.emulateHTTP&&("PUT"===f||"DELETE"===f||"PATCH"===f)){g.type="POST",e.emulateJSON&&(g.data._method=f);var h=e.beforeSend;e.beforeSend=function(a){return a.setRequestHeader("X-HTTP-Method-Override",f),h?h.apply(this,arguments):void 0}}"GET"===g.type||e.emulateJSON||(g.processData=!1);var i=e.error;e.error=function(a,b,c){e.textStatus=b,e.errorThrown=c,i&&i.apply(this,arguments)};var j=e.xhr=b.ajax(c.extend(g,e));return d.trigger("request",d,j,e),j};var w={create:"POST",update:"PUT",patch:"PATCH","delete":"DELETE",read:"GET"};b.ajax=function(){return b.$.ajax.apply(b.$,arguments)};var x=b.Router=function(a){a||(a={}),a.routes&&(this.routes=a.routes),this._bindRoutes(),this.initialize.apply(this,arguments)},y=/\((.*?)\)/g,z=/(\(\?)?:\w+/g,A=/\*\w+/g,B=/[\-{}\[\]+?.,\\\^$|#\s]/g;c.extend(x.prototype,h,{initialize:function(){},route:function(a,d,e){c.isRegExp(a)||(a=this._routeToRegExp(a)),c.isFunction(d)&&(e=d,d=""),e||(e=this[d]);var f=this;return b.history.route(a,function(c){var g=f._extractParameters(a,c);f.execute(e,g,d)!==!1&&(f.trigger.apply(f,["route:"+d].concat(g)),f.trigger("route",d,g),b.history.trigger("route",f,d,g))}),this},execute:function(a,b,c){a&&a.apply(this,b)},navigate:function(a,c){return b.history.navigate(a,c),this},_bindRoutes:function(){if(this.routes){this.routes=c.result(this,"routes");var a,b=c.keys(this.routes);while(null!=(a=b.pop()))this.route(a,this.routes[a])}},_routeToRegExp:function(a){return a=a.replace(B,"\\$&").replace(y,"(?:$1)?").replace(z,function(a,b){return b?a:"([^/?]+)"}).replace(A,"([^?]*?)"),new RegExp("^"+a+"(?:\\?([\\s\\S]*))?$")},_extractParameters:function(a,b){var d=a.exec(b).slice(1);return c.map(d,function(a,b){return b===d.length-1?a||null:a?decodeURIComponent(a):null})}});var C=b.History=function(){this.handlers=[],c.bindAll(this,"checkUrl"),"undefined"!=typeof window&&(this.location=window.location,this.history=window.history)},D=/^[#\/]|\s+$/g,E=/^\/+|\/+$/g,F=/#.*$/;C.started=!1,c.extend(C.prototype,h,{interval:50,atRoot:function(){var a=this.location.pathname.replace(/[^\/]$/,"$&/");return a===this.root&&!this.getSearch()},getSearch:function(){var a=this.location.href.replace(/#.*/,"").match(/\?.+/);return a?a[0]:""},getHash:function(a){var b=(a||this).location.href.match(/#(.*)$/);return b?b[1]:""},getPath:function(){var a=decodeURI(this.location.pathname+this.getSearch()),b=this.root.slice(0,-1);return a.indexOf(b)||(a=a.slice(b.length)),a.slice(1)},getFragment:function(a){return null==a&&(a=this._hasPushState||!this._wantsHashChange?this.getPath():this.getHash()),a.replace(D,"")},start:function(a){if(C.started)throw new Error("Backbone.history has already been started");C.started=!0,this.options=c.extend({root:"/"},this.options,a),this.root=this.options.root,this._wantsHashChange=this.options.hashChange!==!1,this._hasHashChange="onhashchange"in window,this._wantsPushState=!!this.options.pushState,this._hasPushState=!!(this.options.pushState&&this.history&&this.history.pushState),this.fragment=this.getFragment();var b=window.addEventListener||function(a,b){return attachEvent("on"+a,b)};if(this.root=("/"+this.root+"/").replace(E,"/"),!(this._hasHashChange||!this._wantsHashChange||this._wantsPushState&&this._hasPushState)){var d=document.createElement("iframe");d.src="javascript:0",d.style.display="none",d.tabIndex=-1;var e=document.body;this.iframe=e.insertBefore(d,e.firstChild).contentWindow,this.navigate(this.fragment)}if(this._hasPushState?b("popstate",this.checkUrl,!1):this._wantsHashChange&&this._hasHashChange&&!this.iframe?b("hashchange",this.checkUrl,!1):this._wantsHashChange&&(this._checkUrlInterval=setInterval(this.checkUrl,this.interval)),this._wantsHashChange&&this._wantsPushState){if(!this._hasPushState&&!this.atRoot())return this.location.replace(this.root+"#"+this.getPath()),!0;this._hasPushState&&this.atRoot()&&this.navigate(this.getHash(),{replace:!0})}return this.options.silent?void 0:this.loadUrl()},stop:function(){var a=window.removeEventListener||function(a,b){return detachEvent("on"+a,b)};this._hasPushState?a("popstate",this.checkUrl,!1):this._wantsHashChange&&this._hasHashChange&&!this.iframe&&a("hashchange",this.checkUrl,!1),this.iframe&&(document.body.removeChild(this.iframe.frameElement),this.iframe=null),this._checkUrlInterval&&clearInterval(this._checkUrlInterval),C.started=!1},route:function(a,b){this.handlers.unshift({route:a,callback:b})},checkUrl:function(a){var b=this.getFragment();return b===this.fragment&&this.iframe&&(b=this.getHash(this.iframe)),b===this.fragment?!1:(this.iframe&&this.navigate(b),void this.loadUrl())},loadUrl:function(a){return a=this.fragment=this.getFragment(a),c.any(this.handlers,function(b){return b.route.test(a)?(b.callback(a),!0):void 0})},navigate:function(a,b){if(!C.started)return!1;b&&b!==!0||(b={trigger:!!b});var c=this.root+(a=this.getFragment(a||""));if(a=decodeURI(a.replace(F,"")),this.fragment!==a){if(this.fragment=a,""===a&&"/"!==c&&(c=c.slice(0,-1)),this._hasPushState)this.history[b.replace?"replaceState":"pushState"]({},document.title,c);else{if(!this._wantsHashChange)return this.location.assign(c);this._updateHash(this.location,a,b.replace),this.iframe&&a!==this.getHash(this.iframe)&&(b.replace||this.iframe.document.open().close(),this._updateHash(this.iframe.location,a,b.replace))}return b.trigger?this.loadUrl(a):void 0}},_updateHash:function(a,b,c){if(c){var d=a.href.replace(/(javascript:|#).*$/,"");a.replace(d+"#"+b)}else a.hash="#"+b}}),b.history=new C;var G=function(a,b){var d=this,e;e=a&&c.has(a,"constructor")?a.constructor:function(){return d.apply(this,arguments)},c.extend(e,d,b);var f=function(){this.constructor=e};return f.prototype=d.prototype,e.prototype=new f,a&&c.extend(e.prototype,a),e.__super__=d.prototype,e};m.extend=o.extend=x.extend=t.extend=C.extend=G;var H=function(){throw new Error('A "url" property or function must be specified')},I=function(a,b){var c=b.error;b.error=function(d){c&&c(a,d,b),a.trigger("error",a,d,b)}};return b}),function(a){var b={},c=!1,d=[],e=!1;b.modules={};var f=function(){var a=65536,b=0;return function(){return b=(b+1)%a}}(),g=function(a){a=a||6,a=parseInt(a,10),a=isNaN(a)?6:a;var b="0123456789abcdefghijklmnopqrstubwxyzABCEDFGHIJKLMNOPQRSTUVWXYZ",c=b.length-1,d="";while(a--)d+=b[Math.round(Math.random()*c)];return d},h=function(a){return"[object Function]"===Object.prototype.toString.call(a)},i=function(a){return"[object String]"===Object.prototype.toString.call(a)},j=function(a){return"[object Object]"===Object.prototype.toString.call(a)},k=function(a){return"[object Array]"===Object.prototype.toString.call(a)},l=function(a){return null!=a&&a==a.window},m=function(a){return j(a)&&!l(a)&&Object.getPrototypeOf(a)==Object.prototype},n=function(a,b,c){var d=null;for(d in b)c&&(m(b[d])||k(b[d]))?(m(b[d])&&!m(a[d])&&(a[d]={}),k(b[d])&&!k(a[d])&&(a[d]=[]),n(a[d],b[d],c)):void 0!==b[d]&&(a[d]=b[d]);return a};b.version="0.1.3";var o={moduleName:"\u6a21\u5757\u7684\u540d\u5b57\u5fc5\u987b\u4e3a\u5b57\u7b26\u4e32\u5e76\u4e14\u4e0d\u80fd\u4e3a\u7a7a\uff01",moduleFactory:"\u6a21\u5757\u6784\u9020\u5bf9\u8c61\u5fc5\u987b\u662f\u51fd\u6570\uff01"};
b.define=function(a,c){if(h(a)&&(a="",c=a),!a||!i(a))throw new Error(o.moduleName);if(!h(c))throw new Error(o.moduleFactory);var d={exports:{}},e=c.call(this,b.require("dom"),d.exports,d),f=d.exports||e;return a in b?(b[a]=[b.name],b[a].push(f)):b[a]=f,f},b.extend=function(a,c){if(arguments.length>1&&m(a))return n.apply(b,arguments);(h(a)||m(a))&&(c=a,a=""),a=a?a:this;var d=b.require(a);d=d?d:this;var e={exports:{}},f=null,g=e.exports;return h(c)&&(f=c.call(this,d,g,e),f=f||e.exports,n(d,f)),m(c)&&n(d,c),d},b.require=function(a){if(!a)throw new Error(o.moduleName);if(!i(a))return a;var c=b[a];return k(c)&&c.length<2?c[0]:c||null},b.use=function(a,c){if(h(a)&&(c=a,a=[]),i(a)&&(a=[a],c=c),!k(a))throw new Error("\u4ee5\u6765\u6a21\u5757\u53c2\u6570\u4e0d\u6b63\u786e\uff01");var d=[];d.push(b.require("dom"));for(var e=0,f=a.length;f>e;e++)d.push(b.require(a[e]));return c.apply(b,d)},b.extend({isPlainObject:m,isFunction:h,isString:i,isArray:k,isAppcan:e,getOptionId:f,getUID:g}),b.inherit=function(a,b,c){h(a)?a=a:(c=b,b=a,a=function(){});var d;d=b&&b.hasOwnProperty("constructor")?b.constructor:function(){return a.apply(this,arguments),this.initated&&this.initated.apply(this,arguments),this},n(d,a),n(d,c);var e=function(){this.constructor=d};return e.prototype=a.prototype,d.prototype=new e,b&&n(d.prototype,b),d.__super__=a.prototype,d};function p(){for(var a=0,c=d.length;c>a;a++)d[a].call(b);d.length=0}function q(a){return a=h(a)?a:function(){},d.push(a),c?void p():"uexWindow"in window?(c=!0,void p()):void(d.length>1||(h(window.uexOnload)&&d.unshift(window.uexOnload),window.uexOnload=function(a){e=!0,b.isAppcan=!0,a||(c=!0,p())}))}b.ready=q,a.appcan=b}(this),window.appcan&&window.appcan.define("dom",function(a,b,c){c.exports=Zepto}),window.appcan&&appcan.define("Backbone",function(a,b,c){c.exports=Backbone}),window.appcan&&appcan.define("_",function(a,b,c){c.exports=_}),window.appcan&&appcan.define("underscore",function(a,b,c){c.exports=_}),window.appcan&&appcan.extend(function(a,b,c){var d=function(a){try{window.uexLog?window.uexLog&&uexLog.sendLog(a):console&&console.log(a)}catch(b){return b}};a.logs=d}),window.appcan&&appcan.extend("dom",function(a,b,c){!appcan.isAppcan}),appcan&&appcan.define("detect",function(a,b,c){var d={},e={},f=window.navigator.userAgent,g=f.match(/Web[kK]it[\/]{0,1}([\d.]+)/),h=f.match(/(Android);?[\s\/]+([\d.]+)?/),i=f.match(/\(Macintosh\; Intel .*OS X ([\d_.]+).+\)/),j=f.match(/(iPad).*OS\s([\d_]+)/),k=f.match(/(iPod)(.*OS\s([\d_]+))?/),l=!j&&f.match(/(iPhone\sOS)\s([\d_]+)/),m=f.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),n=f.match(/Windows Phone ([\d.]+)/),o=m&&f.match(/TouchPad/),p=f.match(/Kindle\/([\d.]+)/),q=f.match(/Silk\/([\d._]+)/),r=f.match(/(BlackBerry).*Version\/([\d.]+)/),s=f.match(/(BB10).*Version\/([\d.]+)/),t=f.match(/(RIM\sTablet\sOS)\s([\d.]+)/),u=f.match(/PlayBook/),v=f.match(/Chrome\/([\d.]+)/)||f.match(/CriOS\/([\d.]+)/),w=f.match(/Firefox\/([\d.]+)/),x=f.match(/MSIE\s([\d.]+)/)||f.match(/Trident\/[\d](?=[^\?]+).*rv:([0-9.].)/),y=!v&&f.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/),z=y||f.match(/Version\/([\d.]+)([^S](Safari)|[^M]*(Mobile)[^S]*(Safari))/);(e.webkit=!!g)&&(e.version=g[1]),h&&(d.name="android",d.android=!0,d.version=h[2]),l&&!k&&(d.name="iphone",d.ios=d.iphone=!0,d.version=l[2].replace(/_/g,".")),j&&(d.name="ipad",d.ios=d.ipad=!0,d.version=j[2].replace(/_/g,".")),k&&(d.name="ipod",d.ios=d.ipod=!0,d.version=k[3]?k[3].replace(/_/g,"."):null),n&&(d.name="wp",d.wp=!0,d.version=n[1]),m&&(d.name="webos",d.webos=!0,d.version=m[2]),o&&(d.name="touchpad",d.touchpad=!0),r&&(d.name="blackberry",d.blackberry=!0,d.version=r[2]),s&&(d.name="bb10",d.bb10=!0,d.version=s[2]),t&&(d.name="rimtabletos",d.rimtabletos=!0,d.version=t[2]),u&&(e.name="playbook",e.playbook=!0),p&&(d.name="kindle",d.kindle=!0,d.version=p[1]),q&&(e.name="silk",e.silk=!0,e.version=q[1]),!q&&d.android&&f.match(/Kindle Fire/)&&(e.name="silk",e.silk=!0),v&&(e.name="chrome",e.chrome=!0,e.version=v[1]),w&&(e.name="firefox",e.firefox=!0,e.version=w[1]),x&&(e.name="ie",e.ie=!0,e.version=x[1]),z&&(i||d.ios)&&(e.name="safari",e.safari=!0,i&&(e.version=z[1])),i&&(d.name="osx",d.version=i[1].split("_").join(".")),y&&(e.name="webview",e.webview=!0),appcan.isAppcan&&(e.name="appcan",e.appcan=!0),d.tablet=!!(j||u||h&&!f.match(/Mobile/)||w&&f.match(/Tablet/)||x&&!f.match(/Phone/)&&f.match(/Touch/)),d.phone=!(d.tablet||d.ipod||!(h||l||m||r||s||v&&f.match(/Android/)||v&&f.match(/CriOS\/([\d.]+)/)||w&&f.match(/Mobile/)||x&&f.match(/Touch/)));var A=function(){return"ontouchstart"in window||window.DocumentTouch&&window.document instanceof window.DocumentTouch?!0:!1},B=function(){for(var a=document.createElement("div"),b=!1,c=["perspectiveProperty","WebkitPerspective"],d=c.length-1;d>=0;d--)b=b?b:void 0!==a.style[c[d]];if(b){var e=document.createElement("style");e.textContent="@media (-webkit-transform-3d){#test3d{height:3px}}",document.getElementsByTagName("head")[0].appendChild(e),a.id="test3d",document.documentElement.appendChild(a),b=3===a.offsetHeight,e.parentNode.removeChild(e),a.parentNode.removeChild(a)}return b},C={supportTouch:A()},D={support3d:B()};c.exports={browser:e,os:d,event:C,css:D,ua:f}}),appcan&&appcan.define("crypto",function(a,b,c){function d(a){for(var b=[],c=0,d,e=0;256>e;e++)b[e]=e;for(e=0;256>e;e++)c=(c+b[e]+a.charCodeAt(e%a.length))%256,d=b[e],b[e]=b[c],b[c]=d;return b}function e(a,b){var c=0,d=0,e="",f=[],g=null;f=f.concat(b);for(var h=0;h<a.length;h++)c=(c+1)%256,d=(d+f[c])%256,g=f[c],f[c]=f[d],f[d]=g,e+=String.fromCharCode(a.charCodeAt(h)^f[(f[c]+f[d])%256]);return e}function f(a,b){if(!a||!b)return"";var c=d(a);return e(b,c)}c.exports={rc4:f}}),appcan&&appcan.define("database",function(a,b,c){var d=appcan.require("eventEmitter"),e=appcan.getOptionId,f=function(a){this.name=a},g={constructor:f,select:function(a,b){var c=this,d=e();if(1===arguments.length&&appcan.isPlainObject(a)&&(b=a.callback,a=a.sql),appcan.isFunction(b)){if(!a)return b(new Error("sql \u4e3a\u7a7a"));uexDataBaseMgr.cbSelectSql=function(a,d,e){return 1!=d?b(new Error("select error")):(b(null,e,d,a),void c.emit("select",null,e,d,a))}}uexDataBaseMgr.selectSql(this.name,d,a)},exec:function(a,b){var c=this,d=e();if(1===arguments.length&&appcan.isPlainObject(a)&&(b=a.callback,a=a.sql),appcan.isFunction(b)){if(!a)return b(new Error("sql \u4e3a\u7a7a"));uexDataBaseMgr.cbExecuteSql=function(a,d,e){return 2!=d?b(new Error("exec sql error")):(b(null,e,d,a),void c.emit("select",null,e,d,a))}}uexDataBaseMgr.executeSql(this.name,d,a)},transaction:function(a,b){var c=this,d=e();if(1===arguments.length&&appcan.isPlainObject(a)&&(b=a.callback,a=a.sqlFun),appcan.isFunction(b)){if(!appcan.isFunction(a))return b(new Error("exec transaction error"));window.uexDataBaseMgr.cbTransaction=function(a,d,e){return 2!=d?b(new Error("exec transaction!")):(b(null,e,d,a),void c.emit("transaction",null,e,d,a))}}uexDataBaseMgr.transaction(this.name,d,a)}};appcan.extend(g,d),f.prototype=g;var h={create:function(a,b,c){var d=null;return 1===arguments.length&&appcan.isPlainObject(a)&&(d=a,a=d.name,b=d.optId,c=d.callback),a?(appcan.isFunction(b)&&(c=b,b=""),appcan.isFunction(c)&&(uexDataBaseMgr.cbOpenDataBase=function(b,d,e){if(2!=d)return c(new Error("open database error"));var g=new f(a);c(null,e,g,d,b),this.emit("open",null,e,g,d,b)}),void uexDataBaseMgr.openDataBase(a,b)):void c(new Error("\u6570\u636e\u5e93\u540d\u5b57\u4e0d\u80fd\u4e3a\u7a7a\uff01"))},destory:function(a,b,c){var d=null;if(1===arguments.length&&appcan.isPlainObject(a)&&(d=a,a=d.name,b=d.optId,c=d.callback),a){if(appcan.isFunction(b)&&(c=b,b=""),appcan.isFunction(c)){if(!a)return void c(new Error("\u6570\u636e\u5e93\u540d\u5b57\u4e0d\u80fd\u4e3a\u7a7a\uff01"));uexDataBaseMgr.cbCloseDataBase=function(a,b,d){return 2!=b?c(new Error("close database error")):(c(null,d,b,a),void this.emit("close",null,d,b,a))}}uexDataBaseMgr.closeDataBase(a,b)}},select:function(a,b,c){if(1===arguments.length&&appcan.isPlainObject(a)&&(b=a.sql,c=a.callback,a=a.name),!a||!appcan.isString(a))return c(new Error("\u6570\u636e\u5e93\u540d\u4e0d\u4e3a\u7a7a"));var d=new f(a);d.select(b,c)},exec:function(a,b,c){if(1===arguments.length&&appcan.isPlainObject(a)&&(b=a.sql,c=a.callback,a=a.name),!a||!appcan.isString(a))return c(new Error("\u6570\u636e\u5e93\u540d\u4e0d\u4e3a\u7a7a"));var d=new f(a);d.exec(b,c)},translaction:function(a,b,c){if(1===arguments.length&&appcan.isPlainObject(a)&&(b=a.sqlFun,c=a.callback,a=a.name),!a||!appcan.isString(a))return c(new Error("\u6570\u636e\u5e93\u540d\u4e0d\u4e3a\u7a7a"));var d=new f(a);d.transaction(b,c)}};h=appcan.extend(h,d),c.exports=h}),window.appcan&&appcan.define("device",function(a,b,c){var d=0;function e(a){a=parseInt(a,10),a=isNaN(a)?0:a,uexDevice.vibrate(a)}function f(){uexDevice.cancelVibrate()}function g(a,b){1===arguments.length&&appcan.isPlainObject(a)&&(b=a.callback,a=a.infoId),appcan.isFunction(b)&&(uexDevice.cbGetInfo=function(c,d,e){return 1!=d?b(new Error("get info error"+a)):void b(null,e,d,c)}),uexDevice.getInfo(a)}function h(a){for(var b={},c=0,e=18;e>c;c++)g(c,function(f,g){if(d++,f)return a(f);var h=JSON.parse(g);appcan.extend(b,h),a(b,h,c,e,d)});return b}c.exports={vibrate:e,cancelVibrate:f,getInfo:g,getDeviceInfo:h}}),appcan&&appcan.define("eventEmitter",function(a,b,c){var d={on:function(a,b){this.__events||(this.__events={}),this.__events[a]?this.__events[a].push(b):this.__events[a]=[b]},off:function(a,b){if(this.__events&&a in this.__events)for(var c=0,d=this.__events[a].length;d>c;c++)if(this.__events[a][c]===b)return void this.__events[a].splice(c,1)},once:function(a,b){var c=this,d=function(){b.apply(c,arguments),c.off(d)};this.on(a,d)},addEventListener:function(){return this.on.apply(this,arguments)},removeEventListener:function(){return this.off.apply(this,arguments)},trigger:function(a,b){var c=[].slice.call(arguments,2);if(this.__events&&appcan.isString(a)&&(b=b||this,a&&a in this.__events))for(var d=0,e=this.__events[a].length;e>d;d++)this.__events[a][d].apply(b,c)},emit:function(){return this.trigger.apply(this,arguments)}};appcan.extend(d),c.exports=d}),appcan&&appcan.define("file",function(a,b,c){var d=appcan.getOptionId;function e(a,b){var c=null;1===arguments.length&&appcan.isPlainObject(a)&&(c=a,a=c.filePath,b=c.callback);var e=d();appcan.isFunction(b)&&(uexFileMgr.cbIsFileExistByPath=function(a,c,d){appcan.isFunction(b)&&(2==c?b(null,d,c,a):b(new Error("exist file error"),d,c,a))}),uexFileMgr.isFileExistByPath(e,a),q(e)}function f(a,b){var c=null;1===arguments.length&&appcan.isPlainObject(a)&&(c=a,a=c.filePath,b=c.callback),appcan.isFunction(b)&&(uexFileMgr.cbGetFileTypeByPath=function(a,c,d){if(2!=c)return void b(new Error("get file type error"),null,c,a);var e={};0==d&&(e.isFile=!0),1==d&&(e.isDirectory=!0),b(null,e,c,a)}),uexFileMgr.getFileTypeByPath(a)}function g(a,b,c){var d=null;return 1===arguments.length&&appcan.isPlainObject(a)&&(d=a,a=d.filePath,b=d.length,c=d.callback),a?(appcan.isFunction(b)&&(c=b,b=-1),c=appcan.isFunction(c)?c:function(){},b=b||-1,void e(a,function(d,e){return d?c(d):e?void f(a,function(d,e){return d?c(d):e.isFile?(uexFileMgr.cbReadFile=function(a,b,d){0!=b&&c(new Error("read file error"),d,b,a),c(null,d,b,a)},void n(a,1,function(a,c,d,e){uexFileMgr.readFile(e,b),q(e)})):c(new Error("\u8be5\u8def\u5f84\u4e0d\u662f\u6587\u4ef6"))}):c(new Error("\u6587\u4ef6\u4e0d\u5b58\u5728"))})):c(new Error("file name is empty"))}function h(a,b,c,d){var g=null;return 1===arguments.length&&appcan.isPlainObject(a)&&(g=a,a=g.filePath,b=g.length,c=g.key,d=g.callback),a?(d=appcan.isFunction(d)?d:function(){},b=b||-1,void e(a,function(e,g){return e?d(e):g?void f(a,function(e,f){return e?d(e):f.isFile?(uexFileMgr.cbReadFile=function(a,b,c){0!=b&&d(new Error("read file error"),c,b,a),d(null,c,b,a)},void o(a,1,c,function(a,c,d,e){uexFileMgr.readFile(e,b),q(e)})):d(new Error("\u8be5\u8def\u5f84\u4e0d\u662f\u6587\u4ef6"))}):d(new Error("\u6587\u4ef6\u4e0d\u5b58\u5728"))})):d(new Error("file name is empty"))}function i(a,b){g({filePath:a,callback:function(a,c){var d=null;if(a)return b(a);try{d=c?JSON.parse(c):{},b(null,d)}catch(e){return b(e)}}})}function j(a,b,c,d){var e=null;1===arguments.length&&appcan.isPlainObject(a)&&(e=a,a=e.filePath,b=e.content,d=e.mode,c=e.callback),d=d||0,appcan.isFunction(b)&&(c=b,b=""),n(a,2,function(a,e,f,g){return a?c(a):(uexFileMgr.writeFile(g,d,b),q(g),void c(null))})}function k(a,b,c,d,e){var f=null;1===arguments.length&&appcan.isPlainObject(a)&&(f=a,a=f.filePath,b=f.content,d=f.mode,e=f.key,c=f.callback),d=d||0,appcan.isFunction(b)&&(e=d,d=c,c=b,b=""),o(a,2,e,function(a,e,f,g){return a?c(a):(uexFileMgr.writeFile(g,d,b),q(g),void c(null))})}function l(a,b,c){var d=null;return 1===arguments.length&&appcan.isPlainObject(a)&&(d=a,a=d.filePath,b=d.content,c=d.callback),j(a,b,c,1)}function m(a,b,c,d){var e=null;return 1===arguments.length&&appcan.isPlainObject(a)&&(e=a,a=e.filePath,b=e.content,c=e.key,d=e.callback),k(a,b,d,1,c)}function n(a,b,c){var e=null;return 1===arguments.length&&appcan.isPlainObject(a)&&(e=a,a=e.filePath,b=e.mode,c=e.callback),appcan.isFunction(b)&&(c=b,b=3),b=b||3,appcan.isString(a)?(appcan.isFunction(c)&&(uexFileMgr.cbOpenFile=function(a,b,d){return 2!=b?void c(new Error("open file error"),d,b,a):void c(null,d,b,a)}),void uexFileMgr.openFile(d(),a,b)):c(new Error("\u6587\u4ef6\u8def\u5f84\u4e0d\u6b63\u786e"))}function o(a,b,c,e){var f=null;return 1===arguments.length&&appcan.isPlainObject(a)&&(f=a,a=f.filePath,b=f.mode,c=f.key,e=f.callback),c=c?c:"",b=b||3,appcan.isFunction(e)||(e=null),appcan.isString(a)?(appcan.isFunction(e)&&(uexFileMgr.cbOpenSecure=function(a,b,c){return 2!=b?void e(new Error("open secure file error"),c,b,a):void e(null,c,b,a)}),void uexFileMgr.openSecure(d(),a,b,c)):e(new Error("\u6587\u4ef6\u8def\u5f84\u4e0d\u6b63\u786e"))}function p(a,b){var c=null;1===arguments.length&&appcan.isPlainObject(a)&&(c=a,a=c.filePath,b=c.callback);var e=d();appcan.isFunction(b)&&(uexFileMgr.cbDeleteFileByPath=function(a,c,d){return 2!=c?b(new Error("delete file error")):void b(null,d,c,a)}),uexFileMgr.deleteFileByPath(a),q(e)}function q(a){1===arguments.length&&appcan.isPlainObject(a)&&(a=a.optId),a&&uexFileMgr.closeFile(a)}function r(a,b){var c=null;1===arguments.length&&appcan.isPlainObject(a)&&(c=a,a=c.filePath,b=c.callback);var e=d();appcan.isFunction(b)&&(uexFileMgr.cbCreateFile=function(a,c,d){return 2!=c?b(new Error("create file error"),d,c,a):void b(null,d,c,a)}),uexFileMgr.createFile(e,a),q(e)}function s(a,b,c){var e=null;1===arguments.length&&appcan.isPlainObject(a)&&(e=a,a=e.filePath,b=e.key,c=e.callback),b=b?b:"";var f=d();appcan.isFunction(c)&&(uexFileMgr.cbCreateSecure=function(a,b,d){return 2!=b?c(new Error("create secure file error"),d,b,a):void c(null,d,b,a)}),uexFileMgr.createSecure(f,a,b),q(f)}var t="wgt://data/locFile.txt";function u(a){appcan.isPlainObject(a)&&(a=a.callback),appcan.isFunction(a)||(a=function(){}),p(t,a)}function v(a,b){e(t,function(c,d){return c?b(c):void(d?j(t,a,b):r(t,function(c,d){return c?b(c):void(0==d&&j(t,a,b))}))})}function w(a){return g(t,a)}function x(a,b){var c=null;1===arguments.length&&appcan.isPlainObject(a)&&(c=a,a=c.filePath,b=c.callback),uexFileMgr.cbGetFileRealPath=function(a,c,d){return 0!=c?void b(new Error("get file path error"),d,c,a):void b(null,d,c,a)},uexFileMgr.getFileRealPath(a)}c.exports={wgtPath:"wgt://",resPath:"res://",wgtRootPath:"wgtroot://",open:n,close:q,read:g,readJSON:i,write:j,create:r,remove:p,append:l,exists:e,stat:f,deleteLocalFile:u,writeLocalFile:v,readLocalFile:w,getRealPath:x,createSecure:s,openSecure:o,readSecure:h,writeSecure:k,appendSecure:m}}),window.appcan&&appcan.define("Model",function(a,b,c){var d=appcan.require("Backbone"),e=d.Model.extend({setToken:function(){}});c.exports=e}),appcan&&appcan.define("request",function(a,b,c){var d=0,e=window.document,f,g,h=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,i=/^(?:text|application)\/javascript/i,j=/^(?:text|application)\/xml/i,k="application/json",l="text/html",m=/^\s*$/,n=appcan.getOptionId;function o(a,b,c){appcan.trigger(b,a,c)}function p(a,b,c,d){return a.global?o(b||appcan,c,d):void 0}var q=0;function r(a){a.global&&0===q++&&p(a,null,"ajaxStart")}function s(a){a.global&&!--q&&p(a,null,"ajaxStop")}function t(a,b){var c=b.context;return b.beforeSend.call(c,a,b)===!1||p(b,c,"ajaxBeforeSend",[a,b])===!1?!1:void p(b,c,"ajaxSend",[a,b])}function u(a,b,c,d){var e=c.context,f="success";c.success.call(e,a,f,b),d&&d.resolveWith(e,[a,f,b]),p(c,e,"ajaxSuccess",[b,c,a]),w(f,b,c)}function v(a,b,c,d,e){var f=d.context;d.error.call(f,c,b,a),e&&e.rejectWith(f,[c,b,a]),p(d,f,"ajaxError",[c,d,a||b]),w(b,c,d)}function w(a,b,c){var d=c.context;c.complete.call(d,b,a),p(c,d,"ajaxComplete",[b,c]),s(c)}function x(a,b,c){var d=c.context;c.progress.call(d,a,b,status),p(c,d,"ajaxProgress",[a,b,c])}function y(){}var z={type:"GET",beforeSend:y,success:y,error:y,complete:y,progress:y,context:null,global:!0,certificate:null,appVerify:!0,emulateHTTP:!1,xhr:function(){return window.uexXmlHttpMgr},accepts:{script:"text/javascript, application/javascript, application/x-javascript",json:k,xml:"application/xml, text/xml",html:l,text:"text/plain"},crossDomain:!1,timeout:0,contentType:!1,processData:!1,cache:!0};function A(a){return a&&(a=a.split(";",2)[0]),a&&(a==l?"html":a==k?"json":i.test(a)?"script":j.test(a)&&"xml")||"text"}function B(a,b){return""==b?a:(a+"&"+b).replace(/[&?]{1,2}/,"?")}function C(b,c,d,e,f){var g=b["settings_"+c],h=g.dataType;if(0>d)return void v(null,"request error",b,g,f);if(1==d){b["settings_"+c]=null;var i=!1;e=e||"";try{"script"==h?(1,eval)(e):"xml"==h?e=e:"json"==h&&(e=m.test(e)?null:a.parseJSON(e))}catch(j){i=j}i?v(i,"parsererror",b,g,f):u(e,b,g,f)}else v(null,"error",b,g,f);b.close(c)}function D(a,b,c){var d=b["settings_"+c];x(a,b,d)}function E(b){b.processData&&b.data&&!appcan.isString(b.data)&&(b.data=a.param(b.data,b.traditional)),!b.data||b.type&&"GET"!=b.type.toUpperCase()||(b.data=a.param(b.data,b.traditional),b.url=B(b.url,b.data),b.data=void 0)}function F(b){var c=n(),d=a.extend({},b||{}),e=a.Deferred&&a.Deferred();for(f in z)void 0===d[f]&&(d[f]=z[f]);r(d),d.crossDomain||(d.crossDomain=/^([\w-]+:)?\/\/([^\/]+)/.test(d.url)&&RegExp.$2!=window.location.host),d.url||(d.url=window.location.toString()),E(d);var g=d.dataType,h=/\?.+=\?/.test(d.url);if(h&&(g="jsonp"),d.cache!==!1&&(b&&b.cache===!0||"script"!=g&&"jsonp"!=g)||(d.url=B(d.url,"_="+Date.now())),"jsonp"==g)return h||(d.url=B(d.url,d.jsonp?d.jsonp+"=?":d.jsonp===!1?"":"callback=?")),a.ajaxJSONP(d,e);var i=d.accepts[g],j={},k=function(a,b){j[a.toLowerCase()]=[a,b]},l=/^([\w-]+:)\/\//.test(d.url)?RegExp.$1:window.location.protocol,m=d.xhr(),o=function(a,b){var d={},e=null;for(var f in b)e=b[f],d[e[0]]=e[1];a.setHeaders(c,JSON.stringify(d))},p=function(a){a.appVerify===!0&&m.setAppVerify&&m.setAppVerify(c,1),a.appVerify===!1&&m.setAppVerify&&m.setAppVerify(c,0)},q=function(a){var b=a.certificate;b&&m.setCertificate&&m.setCertificate(c,b.password||"",b.path)},s;if(m["settings_"+c]=d,q(d),p(d),e&&e.promise(m),d.crossDomain||k("X-Requested-With","XMLHttpRequest"),k("Accept",i||"*/*"),(i=d.mimeType||i)&&(i.indexOf(",")>-1&&(i=i.split(",",2)[0]),m.overrideMimeType&&m.overrideMimeType(i)),!d.emulateHTTP||"PUT"!==d.type&&"DELETE"!==d.type&&"PATCH"!==d.type||(k("X-HTTP-Method-Override",d.type),d.type="POST"),(d.contentType||d.contentType!==!1&&d.data&&"GET"!=d.type.toUpperCase())&&k("Content-Type",d.contentType||"application/x-www-form-urlencoded"),d.headers)for(var u in d.headers)k(u,d.headers[u]);if(m.setRequestHeader=k,m.onPostProgress=function(a,b){var c=[b];c.push(m),c.push(a),D.apply(null,c)},m.onData=function(){for(var a=[m],b=0,c=arguments.length;c>b;b++)a.push(arguments[b]);a.push(e),C.apply(null,a)},t(m,d)===!1)return m.close(c),v(null,"abort",m,d,e),m;if(d.xhrFields)for(u in d.xhrFields)m[u]=d.xhrFields[u];var w="async"in d?d.async:!0;if(m.open(c,d.type,d.url,d.timeout),o(m,j),d.data&&d.contentType===!1)for(u in d.data)appcan.isPlainObject(d.data[u])?d.data[u].path?m.setPostData(c,"1",u,d.data[u].path):m.setPostData(c,"0",u,JSON.stringify(d.data[u])):m.setPostData(c,"0",u,d.data[u]);else"application/json"===d.contentType&&appcan.isPlainObject(d.data)&&(d.data=JSON.stringify(d.data)),d.data&&m.setBody(c,d.data?d.data:null);return m.send(c),m}function G(a,b,c,d){return appcan.isFunction(b)&&(d=c,c=b,b=void 0),appcan.isFunction(c)||(d=c,c=void 0),{url:a,data:b,success:c,dataType:d}}function H(){return F(G.apply(null,arguments))}function I(){var a=G.apply(null,arguments);return a.type="POST",F(a)}function J(){var a=G.apply(null,arguments);return a.dataType="json",F(a)}var K=encodeURIComponent;function L(b,c,d,e){var f,g=a.isArray(c),h=a.isPlainObject(c);a.each(c,function(c,i){f=a.type(i),e&&(c=d?e:e+"["+(h||"object"==f||"array"==f?c:"")+"]"),!e&&g?b.add(i.name,i.value):"array"==f||!d&&"object"==f?L(b,i,d,c):b.add(c,i)})}function M(a,b){var c=[];return c.add=function(a,b){this.push(K(a)+"="+K(b))},L(c,a,b),c.join("&").replace(/%20/g,"+")}function N(b,c,d){if(b){b=a(b);var e=[],f={color:1,date:1,datetime:1,"datetime-local":1,email:1,hidden:1,month:1,number:1,password:1,radio:1,range:1,search:1,tel:1,text:1,time:1,url:1,week:1},g=["file"],h=["checkbox","radio"],i=["keygen"],j=["input","select","textarea"],k={};c=c||function(){},d=d||function(){};function l(){b.find(j.join(",")).each(function(b,c){if("INPUT"===c.tagName){var d=a(c),e=d.attr("type");e in f&&(k[d.attr("name")]=d.attr("data-ispath")?{path:d.val()}:d.val())}})}var m=b.attr("method"),n=b.attr("action")||location.href;m=(m||"POST").toUpperCase(),l(),F({url:n,type:m,data:k,success:c,error:d})}}c.exports={ajax:F,get:H,post:I,getJSON:J,param:M,postForm:N}}),appcan&&appcan.define("locStorage",function(a,b,c){var d=window.localStorage,e=0,f=0;function g(a,b){try{d&&(appcan.isString(b)||(b=JSON.stringify(b)),d.setItem(a,b))}catch(c){}}function h(a){if(appcan.isPlainObject(a))for(var b in a)a.hasOwnPropery(b)&&g(b,a[b]);else if(appcan.isArray(a))for(e=0,f=a.length;f>e;e++)a[e]&&g.apply(this,a[e]);else g.apply(this,arguments)}function i(a){if(a)try{if(d)return d.getItem(a)}catch(b){}}function j(){for(var a=[],b="",c=0,e=d.length;e>c;c++)b=d.key(c),b&&a.push(b);return a}function k(a){try{a&&appcan.isString(a)?d.removeItem(a):d.clear()}catch(b){}}function l(){var a=5242880-unescape(encodeURIComponent(JSON.stringify(d))).length;return a}function m(a,b){return 1===arguments.length?i(a):void g(a,b)}c.exports={getVal:i,setVal:h,leaveSpace:l,remove:k,keys:j,val:m}}),window.appcan&&appcan.extend(function(a,b,c){var d=function(a){return a?String.prototype.trim?String.prototype.trim.call(a):a.replace(/^\s+|\s+$/gi,""):""},e=function(a){return a?String.prototype.trimLeft?String.prototype.trimLeft.call(a):a.replace(/^\s+/gi,""):""},f=function(a){return a?String.prototype.trimRight?String.prototype.trimRight.call(a):a.replace(/\s+$/gi,""):""},g=function(a){if(!a)return 0;var b=0,c,d;for(c=0;c<a.length;c++)d=a.charCodeAt(c),127>d?b+=1:d>=128&&2047>=d?b+=2:d>=2048&&65535>=d&&(b+=3);return b};c.exports={trim:d,trimLeft:e,trimRight:f,byteLength:g}}),appcan&&appcan.define("User",function(a,b,c){var d=appcan.require("Backbone"),e=appcan.require("database"),f=d.Model.extend({login:function(){},signup:function(){},logout:function(){},changePassword:function(){}});c.exports=f}),window.appcan&&appcan.define("view",function(a,b,c){var d=appcan.require("underscore"),e={},f=function(a){e=d.defaults({},e,a)},g=function(b,c,f,g){g=d.defaults({},e,g);var h=d.template(c,g),i=h(f);return a(b).html(i),i},h=function(b,c,f,g){g=d.defaults({},e,g);var h=d.template(c,g),i=h(f);return a(b).append(i),i};c.exports={template:d.template,render:g,appendRender:h,config:f}}),window.appcan&&appcan.define("window",function(a,b,c){var d=[],e=[],f={},g="",h={};function i(a,b){h[a]=b,uexWindow.setReportKey(a),uexWindow.onKeyPressed=function(a){h[a]&&h[a](a)}}function j(a,b,c,d,e,f,g,h){var i=null;1===arguments.length&&appcan.isPlainObject(a)&&(i=a,a=i.name,e=i.dataType||0,c=i.aniId||0,f=i.width,g=i.height,d=i.type||0,h=i.animDuration,b=i.data),e=e||0,c=c||0,d=d||0,h=h||300,uexWindow.open(a,e,b,c,f,g,d,h)}function k(a,b){var c=null;1===arguments.length&&appcan.isPlainObject(a)&&(c=a,a=c.animId,b=c.animDuration),a&&(a=parseInt(a,10),(isNaN(a)||a>16||0>a)&&(a=-1)),b&&(b=parseInt(b,10),b=isNaN(b)?"":b),b=b||300,uexWindow.close(a,b)}function l(a,b,c){var d=null;1===arguments.length&&appcan.isPlainObject(a)&&(d=a,a=d.name,c=d.type||0,b=d.scriptContent),c=c||0,uexWindow.evaluateScript(a,c,b)}function m(a,b,c){var d=null;1===arguments.length&&appcan.isPlainObject(a)&&(d=a,a=d.name,b=d.popName||0,c=d.scriptContent),a=a||"",appcan.isString(b)&&b&&uexWindow.evaluatePopoverScript(a,b,c)}function n(a,b,c,d,e,f){var g=null;1===arguments.length&&appcan.isPlainObject(a)&&(g=a,a=g.bounceType||1,b=g.startPullCall,c=g.downEndCall,d=g.upEndCall,e=g.color||"rgba(255,255,255,0)",f=g.imgSettings||'{"imagePath":"res://reload.png","textColor":"#530606","pullToReloadText":"\u62d6\u52a8\u5237\u65b0","releaseToReloadText":"\u91ca\u653e\u5237\u65b0","loadingText":"\u52a0\u8f7d\u4e2d\uff0c\u8bf7\u7a0d\u7b49"}'),e=e||"rgba(255,255,255,0)",f=f||'{"imagePath":"res://reload.png","textColor":"#530606","pullToReloadText":"\u62d6\u52a8\u5237\u65b0","releaseToReloadText":"\u91ca\u653e\u5237\u65b0","loadingText":"\u52a0\u8f7d\u4e2d\uff0c\u8bf7\u7a0d\u7b49"}';var h=1;if(uexWindow.onBounceStateChange=function(a,e){0==e&&b&&b(a),1==e&&c&&c(a),2==e&&d&&d(a)},uexWindow.setBounce(h),b||c||d){appcan.isArray(a)||(a=[a]);for(var i in a)uexWindow.showBounceView(a[i],e,"1"),uexWindow.setBounceParams(a[i],f),uexWindow.notifyBounceEvent(a[i],"1")}}function o(){uexWindow.setBounce(1)}function p(){uexWindow.setBounce(0)}function q(a,b,c,d){1===arguments.length&&appcan.isPlainObject(a)&&(c=a.flag,b=a.color,d=a.callback,a=a.type),c=void 0===c?1:c,c=parseInt(c,10),b=b||"rgba(0,0,0,0)",a=void 0===a?0:a,d=d||function(){},o(),uexWindow.showBounceView(a,b,c),c&&(e.push({type:a,callback:d}),uexWindow.onBounceStateChange||(uexWindow.onBounceStateChange=function(b,c){for(var d=null,f=0,g=e.length;g>f;f++)d=e[f],d&&b===d.type&&appcan.isFunction(d.callback)&&d.callback(c,a)}),uexWindow.notifyBounceEvent(a,1))}function r(a,b){1===arguments.length&&appcan.isPlainObject(a)&&(b=a.data,a=a.position),appcan.isPlainObject(b)&&(b=JSON.stringify(b)),uexWindow.setBounceParams(a,b)}function s(a){appcan.isPlainObject(a)&&(a=a.position),a=parseInt(a,10),a=isNaN(a)?0:a,a=a||0,uexWindow.resetBounceView(a)}function t(a,b,c,d){var e=null;1===arguments.length&&appcan.isPlainObject(a)&&(e=a,a=e.msg,b=e.duration,c=e.position||5,d=e.type),d=d||(b?0:1),b=b||0,c=c||5,uexWindow.toast(d,c,a,b)}function u(){uexWindow.closeToast()}function v(a,b,c,d){var e=null;1===arguments.length&&appcan.isPlainObject(a)&&(e=a,a=e.left||0,b=e.top||0,c=e.callback,d=e.duration||250),a=a||0,b=b||0,d=d||250,uexWindow.beginAnimition(),uexWindow.setAnimitionDuration(d),uexWindow.setAnimitionRepeatCount("0"),uexWindow.setAnimitionAutoReverse("0"),uexWindow.makeTranslation(a,b,"0"),uexWindow.commitAnimition(),appcan.isFunction(c)&&(uexWindow.onAnimationFinish=c)}function w(a,b,c,d){1===arguments.length&&appcan.isPlainObject(a)&&(argObj=a,a=argObj.dx||0,b=argObj.dy||0,c=argObj.duration||250,d=argObj.callback||function(){}),uexWindow.onSetWindowFrameFinish=d,uexWindow.setWindowFrame(a,b,c)}function x(b,c,d,e,f){var g=null;1===arguments.length&&appcan.isPlainObject(b)&&(g=b,b=g.id||0,c=g.url,e=g.top,d=g.left,f=g.name),e=e||0,d=d||0;var h=a("#"+b),i=h.width(),j=h.height(),k=h.css("font-size");e=parseInt(e,10),e=isNaN(e)?h.offset().top:e,d=parseInt(d,10),d=isNaN(d)?h.offset().left:d,f=f?f:b,k=parseInt(k,10),k=isNaN(k)?0:k,y(f,0,c,"",d,e,i,j,k,0,0)}function y(a,b,c,d,e,f,g,h,i,j,k){var m=null;if(1===arguments.length&&appcan.isPlainObject(a)&&(m=a,a=m.name,b=m.dataType,c=m.url,d=m.data,e=m.left,f=m.top,g=m.width,h=m.height,i=m.fontSize,j=m.type,k=m.bottomMargin),b=b||0,e=e||0,f=f||0,h=h||0,g=g||0,j=j||0,k=k||0,i=i||0,d=d||"",i=parseInt(i,10),i=isNaN(i)?0:i,uexWidgetOne.platformName&&uexWidgetOne.platformName.toLowerCase().indexOf("ios")>-1){var n=['"'+a+'"',b,'"'+c+'"','"'+d+'"',e,f,g,h,i,j,k],o="uexWindow.openPopover("+n.join(",")+")";return void l("",o)}uexWindow.openPopover(a,b,c,d,e,f,g,h,i,j,k)}function z(a){1===arguments.length&&appcan.isPlainObject(a)&&(a=a.name),uexWindow.closePopover(a)}function A(b,c,d,e){var f=null;1===arguments.length&&appcan.isPlainObject(b)&&(f=b,b=f.id,c=f.left,d=f.top,e=f.name),c=c||0,d=d||0;var g=a("#"+b),h=g.width(),i=g.height();c=parseInt(c,10),c=isNaN(c)?0:c,d=parseInt(d,10),d=isNaN(d)?0:d,e=e?e:b,uexWindow.setPopoverFrame(e,c,d,h,i)}function B(a,b,c,d,e){var f=null;1===arguments.length&&appcan.isPlainObject(a)&&(f=a,a=f.name,b=f.left,c=f.top,d=f.width,e=f.height),b=b||0,c=c||0,d=d||0,e=e||0,b=parseInt(b,10),b=isNaN(b)?0:b,c=parseInt(c,10),c=isNaN(c)?0:c,d=parseInt(d,10),d=isNaN(d)?0:d,e=parseInt(e,10),e=isNaN(e)?0:e,uexWindow.setPopoverFrame(a,b,c,d,e)}function C(a,b,c,d){1===arguments.length&&appcan.isPlainObject(a)&&(d=a.callback,c=a.buttons,b=a.content,a=a.title),a=a||"\u63d0\u793a",c=c||["\u786e\u5b9a"],c=appcan.isArray(c)?c:[c],E(a,b,c,d)}function D(a,b,c){1===arguments.length&&appcan.isPlainObject(a)&&(c=a.buttons,b=a.content,a=a.title),c=appcan.isArray(c)?c:[c],uexWindow.alert(a,b,c[0])}function E(a,b,c,d){1===arguments.length&&appcan.isPlainObject(a)&&(d=a.callback,c=a.buttons,b=a.content,a=a.title),c=appcan.isArray(c)?c:[c],appcan.isFunction(d)&&(uexWindow.cbConfirm=function(a,b,c){return 2!=b?d(new Error("confirm error")):void d(null,c,b,a)}),uexWindow.confirm(a,b,c)}function F(a,b,c,d,e){1===arguments.length&&appcan.isPlainObject(a)&&(e=a.callback,d=a.buttons,b=a.content,c=a.defaultValue,a=a.title),d=appcan.isArray(d)?d:[d],appcan.isFunction(e)&&(uexWindow.cbPrompt=function(a,b,c){try{var c=JSON.parse(c);e(null,c,b,a)}catch(d){e(d)}}),uexWindow.prompt(a,b,c,d)}function G(a){1===arguments.length&&appcan.isPlainObject(a)&&(a=a.name),uexWindow.bringPopoverToFront(a)}function H(a){1===arguments.length&&appcan.isPlainObject(a)&&(a=a.name),uexWindow.sendPopoverToBack(a)}function I(a,b){if(1===arguments.length&&appcan.isPlainObject(a)&&(b=a.callback,a=a.channelId),appcan.isFunction(b)){var c="notify_callback_"+appcan.getUID();uexWindow[c]=b,uexWindow.subscribeChannelNotification(a,c)}}function J(a,b){1===arguments.length&&appcan.isPlainObject(a)&&(b=a.msg,a=a.channelId),appcan.isPlainObject(b)&&(b=JSON.stringify(b)),uexWindow.publishChannelNotification(a,b)}function K(a){1===arguments.length&&appcan.isPlainObject(a)&&(a=a.msg),uexWindow.postGlobalNotification(a)}function L(b){d.length>0&&a.each(d,function(a,c){c&&appcan.isFunction(c)&&c(b)})}function M(a){1===arguments.length&&appcan.isPlainObject(a)&&(a=a.callback),appcan.isFunction(a)&&(d.push(a),uexWindow.onGlobalNotification=function(a){L(a)})}function N(a){if(1===arguments.length&&appcan.isPlainObject(a)&&(a=a.callback),appcan.isFunction(a))for(var b=0,c=d.length;c>b;b++)if(d[b]===a)return void d.splice(b,1)}function O(b,c){if(b);else{if(appcan.isString(c)&&(c=JSON.parse(c)),!c.multiPopName)return;var d=f[c.multiPopName];a.each(d,function(a,b){appcan.isFunction(b)&&b(null,c)})}}function P(b,c,d,e,g,h,i,j,k,l,m){1===arguments.length&&appcan.isPlainObject(b)&&(m=b.indexSelected,l=b.flag,k=b.fontSize,j=b.change,i=b.height,h=b.width,g=b.top,e=b.left,d=b.dataType,c=b.content,b=b.popName),d=d||0,l=l||0,m=parseInt(m,10),m=isNaN(m)?0:m,h=h||0,i=i||0,j=j||function(){},appcan.isString(c)?(c=JSON.parse(conent),c.content||(c={content:c})):c.content||(c={content:c});var n=["inPageName","inUrl","inData"],o=c.content;a.each(o,function(b,c){a.each(n,function(a,b){b in c||(c[b]="")})}),c=JSON.stringify(c),f[b]?f[b].push(j):f[b]=[j],uexWindow.openMultiPopover(c,b,d,e,g,h,i,k,l,m),uexWindow.cbOpenMultiPopover=function(a,b,c){0==a&&(1!=b?O(new Error("multi popover error")):O(null,c))},R(b,m)}function Q(a){1===arguments.length&&appcan.isPlainObject(a)&&(a=a.popName),a&&uexWindow.closeMultiPopover(a)
}function R(a,b){1===arguments.length&&appcan.isPlainObject(a)&&(b=a.index,a=a.popName),a&&(b=parseInt(b,10),b=isNaN(b)?0:b,uexWindow.setSelectedPopOverInMultiWindow&&uexWindow.setSelectedPopOverInMultiWindow(a,b))}c.exports={open:j,close:k,evaluateScript:l,evaluatePopoverScript:m,setBounce:n,setBounceParams:r,enableBounce:o,disableBounce:p,setBounceType:q,resetBounceView:s,openToast:t,closeToast:u,moveAnim:v,popoverElement:x,openPopover:y,closePopover:z,resizePopover:B,resizePopoverByEle:A,alert:C,confirm:E,prompt:F,bringPopoverToFront:G,sendPopoverToBack:H,publish:J,subscribe:I,selectMultiPopover:R,openMultiPopover:P,closeMultiPopover:Q,setWindowFrame:w,monitorKey:i}}),window.appcan&&appcan.define("frame",function(a,b,c){var d=appcan.require("window");c.exports={close:d.closePopover,bringToFront:d.bringPopoverToFront,sendToBack:d.sendPopoverToBack,evaluateScript:d.evaluatePopoverScript,publish:d.publish,subscribe:d.subscribe,selectMulti:d.selectMultiPopover,openMulti:d.openMultiPopover,closeMulti:d.closeMultiPopover,setBounce:d.setBounce,resetBounce:d.resetBounceView,open:function(b,c,e,f,g,h,i){var j=null;if(1===arguments.length&&appcan.isPlainObject(b)&&(j=b,b=j.id||0,c=j.url,f=j.top,e=j.left,g=j.name,h=j.index,i=j.change),appcan.isArray(c)){var k=a("#"+b),l=k.width(),m=k.height(),n=k.css("font-size");f=parseInt(f,10),f=isNaN(f)?k.offset().top:f,e=parseInt(e,10),e=isNaN(e)?k.offset().left:e,g=g?g:b,n=parseInt(n,10),n=isNaN(n)?0:n,d.openMultiPopover(g||b,c,0,e,f,l,m,i||function(){},n,0,h)}else d.popoverElement(b,c,e,f,g)},resize:d.resizePopoverByEle}});


