(function() {
	'use strict';

	// =========================================================================
	//
	// 定数の定義
	//
	// =========================================================================

	var DIVIDER_SIZE = 4;
	var DEFAULT_NORMAL_SIZE = 100;

	var CLASS_PANELBOX = 'panelBox';
	var CLASS_DIVIDEDBOX = 'dividedBox';

	var NORMAL_STATE = 'normal';
	var MINIMUM_STATE = 'min';

	var NORMAL_STATE_SIZE_DATA_NAME = 'normalStateSize';
	var IS_LAST_NORMAL_BOX_DATA_NAME = 'isLastNormalBox';

	var DIVIDED_BOX_INSTANCE_DATA_NAME = 'h5controller-dividedbox-instance';
	var STATE_BOX_INSTANCE_DATA_NAME = 'h5controller-statebox-instance';

	var STATE_BOX_SELECTOR_ATTR = 'data-state-box-selector';
	var STATE_ATTR = 'data-state';
	var BOX_NAME_DATA_NAME = 'box-name';
	var MINIMIZE_DIRECTION_DATA_NAME = 'state-minimize-direction';

	var DIVIDED_BOXES_SELECTOR = '.dividedbox-managed:not(.divider)';

	var READY_CLASS = 'ready';

	// =========================================================================
	//
	// 外部モジュールのキャッシュ
	//
	// =========================================================================

	// =========================================================================
	//
	// コントローラの定義
	//
	// =========================================================================

	var accordionPanelController = {
		/**
		 * @memberOf h5.ui.container.
		 */
		__name: 'h5.ui.container.AccordionPanelController',

		__init: function() {
			// テンプレートの登録
			this.view
					.register(
							'minimizableStateBoxTemplate',
							'<div data-state="normal"><div class="boxHeader"><span class="boxName">[%= boxName %]</span><div class="btn btn-default changeStateButton" data-state="min"><span class="glyphicon glyphicon-minus"></span></div></div><div class="boxContent"></div></div><div class="[%= minimizeDir %]Bar" data-state="min"><div class="btn btn-default changeStateButton" data-state="normal"><span class="glyphicon glyphicon-plus"></span></div><div class="[%= minimizeDir %]BarName">[%= boxName %]</div></div>');

			this._bindedControllers = [];
			this._dividedBoxControllers = [];
			var promises = [];

			// StateBox のバインド
			var stateBoxDef = h5.ui.container.StateBox;
			this.$find('.' + CLASS_PANELBOX).each(this.own(function(i, elem) {
				this._setMinimizableBox(elem);
				// 初期値がminならfixedSize指定を追加
				if ($(elem).data('default-state') === 'min') {
					$(elem).addClass('fixedSize');
				}
				var controller = h5.core.controller(elem, stateBoxDef);
				$(elem).data(STATE_BOX_INSTANCE_DATA_NAME, controller);
				this._bindedControllers.push(controller);
				promises.push(controller.readyPromise);
			}));

			// DividedBox のバインド
			var dbBoxDef = h5.ui.container.DividedBox;
			this.$find('.' + CLASS_DIVIDEDBOX).each(this.own(function(i, elem) {
				var controller = h5.core.controller(elem, dbBoxDef);
				$(elem).data(DIVIDED_BOX_INSTANCE_DATA_NAME, controller);
				this._bindedControllers.push(controller);
				this._dividedBoxControllers.push(controller);
				promises.push(controller.readyPromise);
			}));

			return h5.async.when(promises);
		},

		__ready: function() {
			this._isAllReady = true;

			// manageChildする
			for (var i = 0, l = this._bindedControllers.length; i < l; i++) {
				this.manageChild(this._bindedControllers[i]);
			}
			this._defaultLayoutData = this._getLayoutData();

			// 各dividedBoxについて位置やdividerの表示非表示の調整
			var $dividedBoxRoot = this.$find('.' + CLASS_DIVIDEDBOX);
			$dividedBoxRoot.each(this.ownWithOrg(function(orgThis) {
				var $root = $(orgThis);
				var dividedBoxController = $root.data(DIVIDED_BOX_INSTANCE_DATA_NAME);
				var $boxes = $root.children(DIVIDED_BOXES_SELECTOR);
				this._adjustBoxes($boxes, dividedBoxController);
			}));
		},

		// --- イベントハンドラ --- //

		/**
		 * 変更ボタン
		 *
		 * @memberOf h5.ui.container.AccordionPanelController
		 */
		'.changeStateButton click': function(context, $el) {
			context.event.stopPropagation();

			var state = $el.attr(STATE_ATTR);

			// セレクタが指定されていれば指定されたボックスに対する操作。そうでなければ一番近くのボックス。
			var boxSelector = $el.attr(STATE_BOX_SELECTOR_ATTR);
			if (boxSelector == null) {
				boxSelector = $el.closest(DIVIDED_BOXES_SELECTOR);
			}

			this.changeState(boxSelector, state);
		},

		'{rootElement} state-change': function(context) {
			if (!this._isAllReady) {
				return;
			}

			var event = context.event;

			var $stateBox = $(event.target);

			var $dividedBox = $stateBox.parent().closest('.' + CLASS_DIVIDEDBOX);
			var $boxes = $dividedBox.children(DIVIDED_BOXES_SELECTOR);

			var dividedBoxController = $dividedBox.data(DIVIDED_BOX_INSTANCE_DATA_NAME);
			var stateBoxController = $stateBox.data(STATE_BOX_INSTANCE_DATA_NAME);

			if (dividedBoxController == null) {
				this.log.warn('DividedBoxController が取得できませんでした');
				return;
			}
			if (stateBoxController == null) {
				this.log.warn('StateBoxController が取得できませんでした');
				return;
			}

			this._adjustBoxes($boxes, dividedBoxController);
			dividedBoxController.refresh();
		},

		// ---- Public メソッド ---- //
		/**
		 * 指定した box要素 の state を変更します。
		 *
		 * @param {string|Element|jQuery} boxSelector state を変更する box要素 のセレクタ
		 * @param {string} state state（"normal" または "min" を指定する）
		 */
		changeState: function(boxSelector, state) {
			if (boxSelector == null) {
				throw new Error('boxSelector は値を持つ必要があります');
			}

			if (state == null) {
				throw new Error('state は値を持つ必要があります');
			}
			if (typeof state !== 'string') {
				throw new Error('state は string 型である必要があります');
			}
			if (state !== NORMAL_STATE && state !== MINIMUM_STATE) {
				throw new Error('state は "{0}", "{1}" のどちらかである必要があります; state={2}', NORMAL_STATE,
						MINIMUM_STATE, state);
			}

			var $stateBox = $(boxSelector);
			var $dividedBox = $stateBox.parent().closest('.dividedBox');


			var stateBoxController = $stateBox.data(STATE_BOX_INSTANCE_DATA_NAME);
			if (stateBoxController == null) {
				this.log.warn('boxSelector "{0}" の要素に StateBox がバインドされていませんでした', boxSelector);
				return;
			}


			// dividedBox内かどうか
			var isInDividedBox = $dividedBox.length !== 0;

			if (!isInDividedBox) {
				this.log.warn('boxSelector "|0}" の要素が dividedBox 外でした');
			}

			var oldState = stateBoxController.getState();

			// stateの変更がない場合は何もしない
			if (state === oldState) {
				return;
			}


			// dividedBox内のStateBoxでかつ、normalからminへの変更の場合は現在のサイズを記憶する
			// _adjustBoxのタイミングで覚えたサイズに戻す
			if (isInDividedBox) {
				if (oldState === NORMAL_STATE) {
					var isVertical = $dividedBox.hasClass('vertical');
					var size = isVertical ? $stateBox.outerHeight() : $stateBox.outerWidth();
					$stateBox.data(NORMAL_STATE_SIZE_DATA_NAME, size);
				} else if (state === NORMAL_STATE) {
					var size = $stateBox.data(NORMAL_STATE_SIZE_DATA_NAME);
					if (size) {
						var dividedBoxController = $dividedBox.data(DIVIDED_BOX_INSTANCE_DATA_NAME);
						dividedBoxController && dividedBoxController.resize($stateBox, size);
					}
				}
			}
			stateBoxController.setState(state);
			this.refresh();
		},

		refresh: function(context) {
			for (var i = 0, controllers = this._dividedBoxControllers, l = controllers.length; i < l; i++) {
				controllers[i].refresh();
			}
		},

		// --- Private プロパティ --- //

		_bindedControllers: null,

		_dividedBoxControllers: null,

		_isAllReady: false,

		_isResizing: false,

		_defaultLayoutData: null,

		_isDisableResize: false,

		// --- Private メソッド --- //
		_setDividedBoxesSize: function(dividedBoxController, sizeArray) {
			// 最初にリフレッシュする
			dividedBoxController.refresh();

			// 最後のまで resize すると崩れる
			for (var i = 0, len = sizeArray.length - 1; i < len; i++) {
				var size = sizeArray[i];
				dividedBoxController.resize(i, size);
			}
		},

		_setMinimizableBox: function(elem) {
			var $box = $(elem);

			// 既にstateが定義されていたら何もしない
			if ($box.find('>[' + STATE_ATTR + ']').length) {
				return;
			}

			// stateが未定義なら中身をnormalのstateにする。minのstateも自動生成する

			var boxName = $box.data(BOX_NAME_DATA_NAME);
			var minimizeDir = $box.data(MINIMIZE_DIRECTION_DATA_NAME);
			// 最小化する方向はDividedBoxの分割向きに合わせる
			// 縦積みかどうか。verticalが明示的に指定されているなら縦積み
			var isVertical = $box.closest('.' + CLASS_DIVIDEDBOX).hasClass('vertical');
			if (minimizeDir === 'bottom' || minimizeDir === 'right') {
				// rightまたはbottomが指定されているならその方向。ただし、rightが指定されていても水平区切り(縦積み)ならbottomとして扱う
				minimizeDir = isVertical ? 'bottom' : 'right';
			} else {
				// デフォルトはleft,top方向。leftが指定されていても水平区切り(縦積み)ならtopとして扱う
				minimizeDir = isVertical ? 'top' : 'left';
			}
			var $boxWrapper = $(this.view.get('minimizableStateBoxTemplate', {
				minimizeDir: minimizeDir,
				boxName: boxName
			}));
			var $contents = $box.children();
			$box.append($boxWrapper);
			$boxWrapper.find('.boxContent').append($contents);
		},

		_adjustBoxes: function($boxes, dividedBoxController) {
			/* jshint maxcomplexity: 24, maxdepth: 3 */
			var stateList = $boxes.map(function(i, boxElem) {
				var $box = $(boxElem);
				var controller = $box.data(STATE_BOX_INSTANCE_DATA_NAME);
				if (controller == null) {
					return NORMAL_STATE;
				}
				return controller.getState();
			});

			var lastIndex = stateList.length - 1;

			var i, len, state;


			// divider を有効にする位置の計算
			var showDividerFlags = [];
			for (i = 0, len = stateList.length - 1; i < len; i++) {
				showDividerFlags.push(false);
			}

			var hasNormal = false;

			for (i = stateList.length - 1; 0 <= i; i--) {
				state = stateList[i];
				if (state !== NORMAL_STATE) {
					continue;
				}

				if (!hasNormal) {
					hasNormal = true;
					continue;
				}

				showDividerFlags[i] = true;
			}

			var $dividedBox = $(dividedBoxController.rootElement);
			var isVertical = $dividedBox.is('.vertical');
			var sizeMethod = isVertical ? 'outerHeight' : 'outerWidth';
			var sizeProperty = isVertical ? 'height' : 'width';
			var scrollSizeProperty = isVertical ? 'scrollHeight' : 'scrollWidth';


			var dividedBoxSize = $dividedBox[sizeMethod]();
			var otherSize = dividedBoxSize;


			// divider の有効/無効を反映
			for (i = 0, len = showDividerFlags.length; i < len; i++) {
				var isShowDivider = showDividerFlags[i];
				if (isShowDivider) {
					dividedBoxController.showDivider(i);
					otherSize -= DIVIDER_SIZE;
					dividedBoxController.unfixSize(i);
				} else {
					dividedBoxController.hideDivider(i);
					dividedBoxController.fixSize(i);
				}
			}

			// min すべてのサイズの引き算と最後の normal の発見
			var lastNormalIndex = null;
			var sizeCache = {};

			for (i = lastIndex; 0 <= i; i--) {
				state = stateList[i];

				if (state === NORMAL_STATE) {
					if (lastNormalIndex == null) {
						lastNormalIndex = i;
					}
					continue;
				}

				var boxController = $boxes.eq(i).data(STATE_BOX_INSTANCE_DATA_NAME);

				var boxSize;
				if (boxController == null) {
					boxSize = $boxes.eq(i)[0][scrollSizeProperty];
				} else {
					boxSize = boxController.getContentsSize()[sizeProperty];
				}
				sizeCache[i] = boxSize;
				otherSize -= boxSize;
			}

			// normal がなかったら最後の一つ上を normal 扱いにする
			if (lastNormalIndex == null) {
				lastNormalIndex = lastIndex - 1;
				otherSize += sizeCache[lastNormalIndex];
				delete sizeCache[lastNormalIndex];
			}

			// 最初にリフレッシュ
			dividedBoxController.refresh();

			// 一番上を最大に広げる
			for (i = lastIndex; 1 <= i; i--) {
				dividedBoxController.resize(i, DIVIDER_SIZE + 1, {
					partition: 1
				});
			}

			// 最後の normal であるかどうかのフラグをリセットする
			$boxes.data(IS_LAST_NORMAL_BOX_DATA_NAME, false);

			// 上から最後以外を resize で設定していく
			for (i = 0, len = stateList.length - 1; i < len; i++) {
				if (i === lastNormalIndex) {
					$boxes.eq(i).data(IS_LAST_NORMAL_BOX_DATA_NAME, true);
					dividedBoxController.resize(i, otherSize);
					continue;
				}

				state = stateList[i];

				if (state === MINIMUM_STATE) {
					var minBoxSize = sizeCache[i];
					dividedBoxController.resize(i, minBoxSize);
					dividedBoxController.refresh();
					continue;
				}

				var $stateBox = $boxes.eq(i);
				var normalStateSize = $stateBox.attr('data-' + NORMAL_STATE_SIZE_DATA_NAME);

				// サイズがとれない場合でもとりあえずリサイズしておく
				if (normalStateSize == null) {
					normalStateSize = DEFAULT_NORMAL_SIZE;
				}

				dividedBoxController.resize(i, normalStateSize);
				otherSize -= normalStateSize;
			}
		},

		_resizeDividedBoxContents: function($el) {
			/* jshint maxdepth: 3 */
			if (this._isDisableResize) {
				return;
			}

			var inLoop = this._isResizing;
			this._isResizing = true;

			var $boxes = $el.children(DIVIDED_BOXES_SELECTOR);
			var controller = $el.data(DIVIDED_BOX_INSTANCE_DATA_NAME);

			var stateList = $boxes.map(function(i, boxElem) {
				var $box = $(boxElem);
				var stateBoxController = $box.data(STATE_BOX_INSTANCE_DATA_NAME);
				if (stateBoxController == null) {
					return NORMAL_STATE;
				}
				return stateBoxController.getState();
			});

			controller.refresh();

			var i, state;

			var lastIndex = $boxes.length - 1;
			var lastNormalIndex = null;

			// 一番最後の normal を探す
			for (i = lastIndex; 0 <= i; i--) {
				state = stateList[i];
				if (state === NORMAL_STATE) {
					lastNormalIndex = i;
					break;
				}
			}

			// normal がなかったら最後一個前を normal 扱いにする
			if (lastNormalIndex == null) {
				lastNormalIndex = lastIndex - 1;
			}

			// lastNormalIndex より後は下（右）方向に fitToContents
			for (i = lastIndex; lastNormalIndex < i; i--) {
				controller.fitToContents(i, {
					partition: 1
				});
			}

			// lastNormalIndex より前の min を上（左）方向に fitToContents
			for (i = 0; i < lastNormalIndex; i++) {
				state = stateList[i];
				if (state === MINIMUM_STATE) {
					controller.fitToContents(i, {
						partition: 0
					});
				}
			}


			var selector = '.' + CLASS_DIVIDEDBOX;

			$el.find(selector).each(this.own(function(i, child) {
				var $child = $(child);
				if (!$child.parent().closest(selector).is($el)) {
					return;
				}

				if ($child.is(':hidden')) {
					return;
				}

				this._resizeDividedBoxContents($child);
			}));

			if (!inLoop) {
				this._refreshGrid();
				this._isResizing = false;
			}
		},

		_getLayoutData: function() {
			var layoutData = [];

			var $dividedBoxes = this.$find('.dividedBox');
			$dividedBoxes.each(function(i, dividedBox) {
				var $dividedBox = $(dividedBox);
				var isVertical = $dividedBox.hasClass('vertical');
				var sizeMethod = isVertical ? 'outerHeight' : 'outerWidth';

				var dividedBoxData = [];

				$dividedBox.children(DIVIDED_BOXES_SELECTOR).each(function(j, box) {
					var $box = $(box);
					var size = $box[sizeMethod]();

					var boxData = {};

					var stateBoxController = $box.data(STATE_BOX_INSTANCE_DATA_NAME);
					if (stateBoxController == null) {
						boxData.size = size;
					} else if (stateBoxController.getState() === MINIMUM_STATE) {
						boxData.state = MINIMUM_STATE;
						boxData.normalStateSize = $box.data(NORMAL_STATE_SIZE_DATA_NAME);
					} else {
						boxData.state = NORMAL_STATE;
						boxData.size = size;
					}

					dividedBoxData.push(boxData);
				});

				layoutData.push(dividedBoxData);
			});

			return layoutData;
		}
	};

	// =========================================================================
	//
	// 外部への公開
	//
	// =========================================================================

	h5.core.expose(accordionPanelController);

})();
