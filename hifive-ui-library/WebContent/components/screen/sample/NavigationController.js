/*
 * Copyright (C) 2012-2014 NS Solutions Corporation
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
(function() {
	var navigationController = {
		/**
		 * @memberOf app.controller.NavigationController
		 */
		__name: 'app.controller.NavigationController',

		/**
		 * スクリーンのコンテンツURLリスト
		 *
		 * @memberOf app.controller.NavigationController
		 */
		_urlList: ['page1.html', 'page2.html', 'page3.html'],

		/**
		 * 現在スクリーンに表示中のコンテンツURLのインデックス
		 *
		 * @memberOf app.controller.NavigationController
		 */
		_urlIndex: 0,

		/**
		 * トラック操作開始からの移動量
		 *
		 * @memberOf app.controller.NavigationController
		 */
		_totalSlideAmount: 0,

		/**
		 * トラック操作中かどうか
		 *
		 * @memberOf app.controller.NavigationController
		 */
		_isTracking: false,

		/**
		 * @memberOf app.controller.NavigationController
		 */
		__ready: function() {
			this._$trackArea = this.$find('.screentrack');
			// URLリストの最初のページをロード
			this.trigger('loadPage', {
				url: this._urlList[this._urlIndex]
			});
		},

		/**
		 * @memberOf app.controller.NavigationController
		 * @param context
		 */
		'.prevpage click': function(context) {
			context.event.preventDefault();
			// 前(左)のページへスライドして、指定したURLをロード
			this._urlIndex = this._urlIndex === 0 ? this._urlList.length - 1 : --this._urlIndex;
			this.trigger('prevPage', {
				url: this._urlList[this._urlIndex]
			});
		},

		/**
		 * @memberOf app.controller.NavigationController
		 * @param context
		 */
		'.nextpage click': function(context) {
			context.event.preventDefault();
			// 前(左)のページへスライドして、指定したURLをロード
			this._urlIndex = this._urlIndex === this._urlList.length - 1 ? 0 : ++this._urlIndex;
			this.trigger('nextPage', {
				url: this._urlList[this._urlIndex]
			});
		},

		/**
		 * トラック
		 *
		 * @param context
		 * @memberOf app.controller.NavigationController
		 */
		'.screentrack h5trackstart': function(context) {
			// スクリーンがアニメーション動作中ならキャンセル
			if ($('.screen').hasClass('inOperation')) {
				return;
			}
			this._isTracking = true;
			this.trigger('screenTrackstart', {
				trackSize: this.$find('.screentrack').width()
			});
			this._totalSlideAmount = 0;
		},

		/**
		 * トラック
		 *
		 * @param context
		 * @memberOf app.controller.NavigationController
		 */
		'.screentrack h5trackmove': function(context) {
			if (!this._isTracking) {
				return;
			}
			var offsetX = context.event.offsetX;
			// トラック可能領域を制限
			if (offsetX < 0 || this.$find('.screentrack').width() < offsetX) {
				return;
			}
			var dx = context.event.dx;
			this._totalSlideAmount += dx;
			this.trigger('screenTrackmove', {
				dx: dx
			});
		},

		/**
		 * トラック
		 *
		 * @param context
		 * @memberOf app.controller.NavigationController
		 */
		'.screentrack h5trackend': function(context) {
			if (!this._isTracking) {
				return;
			}
			this._isTracking = false;
			// 移動先を判定
			if (this._totalSlideAmount > 100) {
				page = 'prev';
				this._urlIndex = this._urlIndex === 0 ? this._urlList.length - 1 : --this._urlIndex;
			} else if (this._totalSlideAmount < -100) {
				page = 'next';
				this._urlIndex = this._urlIndex === this._urlList.length - 1 ? 0 : ++this._urlIndex;
			} else {
				page = 'current';
			}

			this.trigger('screenTrackend', {
				page: page,
				url: this._urlList[this._urlIndex]
			});
		}
	};
	h5.core.expose(navigationController);
})();