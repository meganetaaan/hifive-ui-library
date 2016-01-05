/*
 * Copyright (C) 2014 NS Solutions Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

//----------------------------------------------------------------------------
// h5.ui.components.artboard.controller.MagnifierController
//----------------------------------------------------------------------------
(function($) {
	//------------------------------------------------------------
	// Const
	//------------------------------------------------------------
	var DEFAULT_SCALE = 2;

	var CLASS_CANVAS_WRAPPER = 'h5-artboard-canvas-wrapper';
	var CLASS_LAYERS = 'h5-artboard-layers';
	var CLASS_BG_LAYER = 'background-layer';
	var CLASS_SVG_LAYER = 'svg-layer';
	var CLASS_MAGNIFIER = 'h5-artboard-magnifier';

	var ERR_MSG_DISPOSED = 'dispose()されたMagnifierクラスのメソッドは呼び出せません';
	var ERR_MSG_SCALE_NOT_A_NUMBER = 'setScale()に渡す拡大率は数値で指定してください';
	var ERR_MSG_SIZE_OBJECT = 'setSize()に渡すサイズは、プロパティwidth,heightに数値を指定したオブジェクトを指定してください';

	//------------------------------------------------------------
	// Cache
	//------------------------------------------------------------
	var XMLNS = h5.ui.components.artboard.consts.XMLNS;
	var XLINKNS = h5.ui.components.artboard.consts.XLINKNS;

	//------------------------------------------------------------
	// Variable
	//------------------------------------------------------------
	var TRACK_EVENTS = ['mousemove', 'h5trackstart', 'h5trackmove', 'h5trackend'];

	//------------------------------------------------------------
	// Body
	//------------------------------------------------------------
	/**
	 * Magnifierクラス
	 *
	 * @param board {DOM|jQuery} 拡大表示対象になる元のお絵かきボード要素
	 * @param settings {Object}
	 * @class
	 */
	function Magnifier(board, settings) {
		settings = settings || {};
		var $board = $(board);
		this._$orgLayers = $board.hasClass(CLASS_LAYERS) ? $board : $board.find('.' + CLASS_LAYERS);
		this._$orgBg = this._$orgLayers.find('>.' + CLASS_BG_LAYER);
		this._$orgSvg = this._$orgLayers.find('>.' + CLASS_SVG_LAYER);
		this._$orgG = this._$orgSvg.find('>g');
		this._scale = settings.scale || DEFAULT_SCALE;

		this._$root = $('<div></div>').addClass(CLASS_MAGNIFIER);
		this._$view = $('<div></div>').addClass(CLASS_CANVAS_WRAPPER);
		this._$layerWrapper = $('<div></div>').addClass(CLASS_LAYERS);
		this._$bg = $('<div></div>').addClass(CLASS_BG_LAYER);
		this._$svg = $(document.createElementNS(XMLNS, 'svg')).attr('class', CLASS_SVG_LAYER); //svg要素はattr()でクラスを当てる必要あり
		this._$layerWrapper.append(this._$bg);
		this._$layerWrapper.append(this._$svg);
		this._$view.append(this._$layerWrapper);
		this._$root.append(this._$view);

		// useタグの生成
		this._use = document.createElementNS(XMLNS, 'use');
		this._use.setAttributeNS(XMLNS, 'xlink', XMLNS);
		this._use.setAttributeNS(XLINKNS, 'href', '#' + this._$orgG.attr('id'));
		this._$svg.append(this._use);

		this._rootW = settings.width;
		this._rootH = settings.height;

		// 指定されたスケールとサイズを適用
		this._refresh();
	}

	$.extend(Magnifier.prototype, {
		getElement: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			return this._$root;
		},
		setScale: function(scale) {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			scale = parseFloat(scale);
			if (isNaN(scale)) {
				throw new Error(ERR_MSG_SCALE_NOT_A_NUMBER);
			}
			this._scale = scale;
			this._refresh();
		},
		setSize: function(size) {
			if (!size) {
				throw new Error(ERR_MSG_SIZE_OBJECT);
			}
			var width = parseFloat(size.width);
			var height = parseFloat(size.height);
			if (isNaN(width) || isNaN(height)) {
				throw new Error(ERR_MSG_SIZE_OBJECT);
			}
			this._rootW = width;
			this._rootH = height;
		},
		focus: function(x, y) {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._refresh();
			var use = this._use;
			use.setAttribute('x', -x + this._rootW / 2);
			use.setAttribute('y', -y + this._rootH / 2);
		},

		/**
		 * @param x
		 * @param y
		 * @param {boolean} center 中央の座標指定かどうか(falseなら左上の座標)
		 */
		move: function(x, y, center) {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			if (center) {
				// outerWidth/Heightでやらないとボーダー分ずれる
				x -= this._$root.outerWidth() / 2;
				y -= this._$root.outerHeight() / 2;
			}
			this._$root.css({
				left: x,
				top: y
			});
		},

		show: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._$root.css('display', 'block');
		},

		hide: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._$root.css('display', 'none');
		},
		addDisposeHandler: function(handler) {
			this._disposeHandlers = this._disposeHandlers || [];
			this._disposeHandlers.push(handler);
		},

		dispose: function() {
			if (this._disposed) {
				throw new Error(ERR_MSG_DISPOSED);
			}
			this._$root.remove();

			if (this._disposeHandlers) {
				for (var i = 0, l = this._disposeHandlers.length; i < l; i++) {
					this._disposeHandlers[i](this);
				}
			}
			for ( var p in this) {
				this[p] = null;
			}

			this._disposed = true;
		},
		_refresh: function() {
			this._$root.css({
				width: this._rootW,
				height: this._rootH
			});
			var scaleVal = 'scale(' + this._scale + ')';
			this._$svg.css({
				'-webkit-transform': scaleVal,
				transform: scaleVal
			});
		}
	});

	/**
	 * 拡大表示のマウスオーバー追従を行うコントローラ@class
	 *
	 * @name h5.ui.components.artboard.controller.MagnifierMouseoverController
	 */
	var mouseoverController = {
		_mag: null,
		$board: null,
		mouseoverMove: null,
		mouseoverFocus: null,
		_boardOffset: null,
		__name: 'h5.ui.components.artboard.controller.MagnifierMouseoverController',
		__construct: function(ctx) {
			var args = ctx.args;
			this.mag = args.mag;
			this.mag.hide();
			this.magElement = this.mag.getElement();
			this.$board = args.$board;
			this.mouseoverMove = args.mouseoverMove;
			this.mouseoverFocus = args.mouseoverFocus;
			this.mag.addDisposeHandler(this.own(function() {
				this.parentController.unmanageChild(this);
			}));
			var boardOffset = this.$board.offset();
			this._boardOffset = {
				left: boardOffset.left,
				top: boardOffset.top
			};
		},
		'{this.$board} h5trackstart': function(ctx, $el) {
			this._execute(ctx, $el);
		},
		'{this.$board} h5trackmove': function(ctx, $el) {
			this._execute(ctx, $el);
		},
		'{this.$board} h5trackend': function(ctx, $el) {
			this._execute(ctx, $el);
		},
		'{this.$board} mousemove': function(ctx, $el) {
			this._execute(ctx, $el);
		},
		'{this.magElement} h5trackstart': function(ctx, $el) {
			this._execute(ctx, $el, true);
		},
		'{this.magElement} h5trackmove': function(ctx, $el) {
			this._execute(ctx, $el, true);
		},
		'{this.magElement} h5trackend': function(ctx, $el) {
			this._execute(ctx, $el, true);
		},
		'{this.magElement} mousemove': function(ctx, $el) {
			this._execute(ctx, $el, true);
		},
		_execute: function(ctx, $el, isOnMagElement) {
			var event = ctx.event;
			if (this.mouseoverMove) {
				if (isOnMagElement) {
					$el.css('display', 'none');
					var target = document.elementFromPoint(event.pageX, event.pageY);
					$el.css('display', 'block');
					if (this.$board.find(target).length) {
						this._move(event);
					} else {
						this.mag.hide();
						return;
					}
				} else {
					this._move(event);
				}
			}
			if (this.mouseoverFocus) {
				if (isOnMagElement) {
					$el.css('display', 'none');
					var target = document.elementFromPoint(event.pageX, event.pageY);
					$el.css('display', 'block');
					if (this.$board.find(target).length) {
						this._focus(event);
					}
				} else {
					this._focus(event);
				}
			}
		},
		_move: function(event) {
			if (event.type === 'h5trackend') {
				this.mag.hide();
				return;
			}
			var x = event.pageX;
			var y = event.pageY;
			this.mag.show();
			this.mag.move(x, y, true);
		},
		_focus: function(event) {
			var x = event.pageX - this._boardOffset.left;
			var y = event.pageY - this._boardOffset.top;
			this.mag.focus(x, y);
		}
	};


	/**
	 * Artboardを拡大表示するコントローラ
	 *
	 * @class
	 * @name h5.ui.components.artboard.controller.MagnifierController
	 */
	var controller = {
		/**
		 * @memberOf h5.ui.components.artboard.controller.MagnifierController
		 * @private
		 */
		__name: 'h5.ui.components.artboard.controller.MagnifierController',

		/**
		 * @memberOf h5.ui.components.artboard.controller.MagnifierController
		 * @private
		 */
		__init: function() {
		// 表示エリアの作成

		},

		/**
		 * @memberOf h5.ui.components.artboard.controller.MagnifierController
		 * @private
		 */
		_scale: null,

		/**
		 * Magnifierの作成
		 *
		 * @param $board
		 */
		createMagnifier: function(board, settings) {
			if (this._mag) {
				// 既に作成済みなら既存のものを破棄して新規に作成する
				this._mag.dispose && this._mag.dispose();
			}

			// レイヤを子に持つレイヤラッパー要素を取得
			$board = $(board);
			$board = $board.hasClass(CLASS_LAYERS) ? $board : $board.find('.' + CLASS_LAYERS);
			if ($board.length === 0) {
				throw new Error('createMagnifierの第1引数には' + CLASS_LAYERS
						+ 'クラス要素またはその要素を子に持つ要素を指定してください');
			} else if ($board.length > 1) {
				throw new Error(
						'createMagnifierの第1引数に指定された要素は複数のArtboardが含まれています。複数のArtboardを対象にはできません');
			}
			this._$board = $board;

			var opt = $.extend({}, settings);
			opt.scale = opt.scale || this._scale;
			var mag = new Magnifier($board, opt);
			this._mag = mag;
			var magElement = mag.getElement();
			$(this.rootElement).append(magElement);
			var mouseoverFocus = settings.mouseover || settings.mouseoverFocus;
			var mouseoverMove = settings.mouseover || settings.mouseoverMove;
			if (mouseoverFocus || mouseoveMove) {
				this._mouseoverController = h5.core.controller(this.rootElement,
						mouseoverController, {
							mag: mag,
							$board: $board,
							mouseoverFocus: mouseoverFocus,
							mouseoverMove: mouseoverMove
						});
				// FIXME readyPromiseが終わった状態じゃないとmanageChildでイベントハンドラがバインドされない
				this._mouseoverController.readyPromise.done(this.own(function() {
					this.manageChild(this._mouseoverController);
				}));
			}
			return mag;
		}
	};

	//------------------------------------------------------------
	// expose
	//------------------------------------------------------------
	h5.core.expose(controller);
})(jQuery);