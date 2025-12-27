    /// @dev Throws if called when paused
    modifier whenNotPaused() {
        if (_paused) {
            revert EnforcedPause();
        }
        _;
    }

    /// @dev Throws if called when not paused
    modifier whenPaused() {
        if (!_paused) {
            revert ExpectedPause();
        }
        _;
    }