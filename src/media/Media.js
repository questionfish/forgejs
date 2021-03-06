/**
 * Media class.
 *
 * @constructor FORGE.Media
 * @param {FORGE.Viewer} viewer {@link FORGE.Viewer} reference.
 * @param {SceneMediaConfig} config input media configuration from json
 * @extends {FORGE.BaseObject}
 *
 */
FORGE.Media = function(viewer, config)
{
    /**
     * The viewer reference.
     * @name FORGE.Media#_viewer
     * @type {FORGE.Viewer}
     * @private
     */
    this._viewer = viewer;

    /**
     * Input scene and media config
     * @name FORGE.Media#_config
     * @type {SceneMediaConfig}
     * @private
     */
    this._config = config;

    /**
     * Type of the media
     * @name FORGE.Media#_type
     * @type {string}
     * @private
     */
    this._type = "";

    /**
     * Media options
     * @name  FORGE.Media#_options
     * @type {Object}
     * @private
     */
    this._options = null;

    /**
     * Image reference.
     * @name FORGE.Media#_displayObject
     * @type {FORGE.DisplayObject}
     * @private
     */
    this._displayObject = null;

    /**
     * Loaded flag
     * @name FORGE.Media#_loaded
     * @type {boolean}
     * @private
     */
    this._loaded = false;

    /**
     * On load complete event dispatcher.
     * @name  FORGE.Media#_onLoadComplete
     * @type {FORGE.EventDispatcher}
     * @private
     */
    this._onLoadComplete = null;

    FORGE.BaseObject.call(this, "Media");

    this._boot();
};

FORGE.Media.prototype = Object.create(FORGE.BaseObject.prototype);
FORGE.Media.prototype.constructor = FORGE.Media;

/**
 * Init routine
 * @method FORGE.Media#_boot
 * @private
 */
FORGE.Media.prototype._boot = function()
{
    // This event can no be a lazzy one (memorize is true)
    this._onLoadComplete = new FORGE.EventDispatcher(this, true);

    this._parseConfig(this._config);
};

/**
 * Configuration parsing.
 * @method FORGE.Media#_parseConfig
 * @param {SceneMediaConfig} config input media configuration
 * @private
 */
FORGE.Media.prototype._parseConfig = function(config)
{
    if (typeof config === "undefined" || config === null)
    {
        this._type = FORGE.MediaType.UNDEFINED;
        this._notifyLoadComplete();

        return;
    }

    // Warning : UID is not registered and applied to the FORGE.Image|FORGE.VideoHTML5|FORGE.VideoDash objects for registration
    this._uid = config.uid;

    this._options = (typeof config.options !== "undefined") ? config.options : null;

    this._type = config.type;

    var source = config.source;

    if (typeof config.source !== "undefined" && typeof config.source.format === "undefined")
    {
        config.source.format = FORGE.MediaFormat.FLAT;
    }

    if (this._type === FORGE.MediaType.GRID)
    {
        this._notifyLoadComplete();
        return;
    }

    if (typeof config.source === "undefined" || config.source === null)
    {
        return;
    }

    if (this._type === FORGE.MediaType.IMAGE)
    {
        var imageConfig;

        // If there isn't an URL set, it means that this is a multi resolution image.
        if (!source.url)
        {
            throw "Multi resolution not implemented yet !";
        }

        if (source.format === FORGE.MediaFormat.EQUIRECTANGULAR)
        {
            imageConfig = {
                key: this._uid,
                url: source.url
            };

            this._displayObject = new FORGE.Image(this._viewer, imageConfig);
        }
        else if (source.format === FORGE.MediaFormat.CUBE ||
            source.format === FORGE.MediaFormat.FLAT)
        {
            imageConfig = {
                key: this._uid,
                url: source.url
            };

            this._displayObject = new FORGE.Image(this._viewer, imageConfig);
        }

        else
        {
            throw "Media format not supported";
        }

        this._displayObject.onLoadComplete.addOnce(this._onImageLoadComplete, this);
        return;
    }

    if (this._type === FORGE.MediaType.VIDEO)
    {
        // If the levels property is present, we get all urls from it and put it
        // inside source.url: it means that there is multi-quality. It is way
        // easier to handle for video than for image, as it can never be video
        // tiles to display.
        if (Array.isArray(source.levels))
        {
            source.url = [];
            for (var i = 0, ii = source.levels.length; i < ii; i++)
            {
                if(FORGE.Device.check(source.levels[i].device) === false)
                {
                    continue;
                }

                source.url.push(source.levels[i].url);
            }
        }

        if (typeof source.url !== "string" && source.url.length === 0)
        {
            return;
        }

        if (typeof source.streaming !== "undefined" && source.streaming.toLowerCase() === FORGE.VideoFormat.DASH)
        {
            this._displayObject = new FORGE.VideoDash(this._viewer, this._uid);
        }
        else
        {
            var scene = this._viewer.story.scene;

            // check of the ambisonic state of the video sound prior to the video instanciation
            this._displayObject = new FORGE.VideoHTML5(this._viewer, this._uid, null, null, (scene.hasSoundTarget(this._uid) === true && scene.isAmbisonic() === true ? true : false));
        }

        // At this point, source.url is either a streaming address, a simple
        // url, or an array of url
        this._displayObject.load(source.url);

        this._displayObject.onLoadedMetaData.addOnce(this._onLoadedMetaDataHandler, this);
        return;
    }
};

/**
 * Internal handler on image ready.
 * @method FORGE.Media#_onImageLoadComplete
 * @private
 */
FORGE.Media.prototype._onImageLoadComplete = function()
{
    this._notifyLoadComplete();
};

/**
 * Internal handler on video metadata loaded.
 * @method FORGE.Media#_onLoadedMetaDataHandler
 * @private
 */
FORGE.Media.prototype._onLoadedMetaDataHandler = function()
{
    if (this._options !== null)
    {
        this._displayObject.volume = (typeof this._options.volume === "number") ? this._options.volume : 1;
        this._displayObject.loop = (typeof this._options.loop === "boolean") ? this._options.loop : true;
        this._displayObject.currentTime = (typeof this._options.startTime === "number") ? this._options.startTime : 0;

        if (this._options.autoPlay === true && document[FORGE.Device.visibilityState] === "visible")
        {
            this._displayObject.play();
        }

        this._displayObject.autoPause = this._options.autoPause;
        this._displayObject.autoResume = this._options.autoResume;
    }

    this._notifyLoadComplete();
};

/**
 * Method to dispatch the load complete event and set the media ready.
 * @method FORGE.Media#_onLoadedMetaDataHandler
 */
FORGE.Media.prototype._notifyLoadComplete = function()
{
    this._loaded = true;
    this._onLoadComplete.dispatch();
};

/**
 * Media destroy sequence
 *
 * @method FORGE.Media#destroy
 */
FORGE.Media.prototype.destroy = function()
{
    if (this._displayObject !== null)
    {
        this._displayObject.destroy();
        this._displayObject = null;
    }

    if (this._onLoadComplete !== null)
    {
        this._onLoadComplete.destroy();
        this._onLoadComplete = null;
    }

    this._viewer = null;
};

/**
 * Get the media config.
 * @name  FORGE.Media#config
 * @type {SceneMediaConfig}
 * @readonly
 */
Object.defineProperty(FORGE.Media.prototype, "config",
{
    /** @this {FORGE.Media} */
    get: function()
    {
        return this._config;
    }
});

/**
 * Get the media type.
 * @name  FORGE.Media#type
 * @type {string}
 * @readonly
 */
Object.defineProperty(FORGE.Media.prototype, "type",
{
    /** @this {FORGE.Media} */
    get: function()
    {
        return this._type;
    }
});

/**
 * Get the displayObject.
 * @name  FORGE.Media#displayObject
 * @type {FORGE.DisplayObject}
 * @readonly
 */
Object.defineProperty(FORGE.Media.prototype, "displayObject",
{
    /** @this {FORGE.Media} */
    get: function()
    {
        return this._displayObject;
    }
});

/**
 * Get the loaded flag
 * @name FORGE.Media#loaded
 * @type {boolean}
 * @readonly
 */
Object.defineProperty(FORGE.Media.prototype, "loaded",
{
    /** @this {FORGE.Media} */
    get: function()
    {
        return this._loaded;
    }
});

/**
 * Get the onLoadComplete {@link FORGE.EventDispatcher}.
 * @name FORGE.Media#onLoadComplete
 * @type {FORGE.EventDispatcher}
 * @readonly
 */
Object.defineProperty(FORGE.Media.prototype, "onLoadComplete",
{
    /** @this {FORGE.Media} */
    get: function()
    {
        return this._onLoadComplete;
    }
});
