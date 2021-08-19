sap.ui.define([
		"ZHR_FI_TV_RES/ZHR_FI_TV_RES/controller/BaseController"
	], function (BaseController) {
		"use strict";

		return BaseController.extend("ZHR_FI_TV_RES.ZHR_FI_TV_RES.controller.NotFound", {

			/**
			 * Navigates to the worklist when the link is pressed
			 * @public
			 */
			onLinkPressed : function () {
				this.getRouter().navTo("worklist");
			}

		});

	}
);