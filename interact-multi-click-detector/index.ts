// version 1.1.0
export class InteractMultiClickDetector {
    private static readonly _STATES: Record<
        number,
        {
            lastIsInteracting: boolean;
            clickCount: number;
            sequenceStartTime: number;
        }
    > = {};

    private static readonly _WINDOW_MS = 1_000; // Time window in milliseconds for a valid multi click sequence.

    private static readonly _REQUIRED_CLICKS = 3; // Number of clicks required to trigger a multi click sequence.

    // Call this in the `OngoingPlayer` trigger to check if the player has performed a multi click sequence with the interact button.
    public static checkMultiClick(player: mod.Player): boolean {
        const playerId = mod.GetObjId(player);
        const isInteracting = mod.GetSoldierState(player, mod.SoldierStateBool.IsInteracting);

        let state = this._STATES[playerId];

        // If player's state is undefined, create it.
        if (!state) {
            this._STATES[playerId] = state = {
                lastIsInteracting: isInteracting,
                clickCount: 0,
                sequenceStartTime: 0,
            };
        }

        if (isInteracting === state.lastIsInteracting) return false; // Fast exit for the vast majority of ticks.

        state.lastIsInteracting = isInteracting;

        if (!isInteracting) return false; // Return false on a falling edge.

        const now = Date.now();

        // If the time window has passed, reset the sequence.
        if (state.clickCount > 0 && now - state.sequenceStartTime > this._WINDOW_MS) {
            state.clickCount = 0;
        }

        if (state.clickCount === 0) {
            state.sequenceStartTime = now;
            state.clickCount = 1;

            return false;
        }

        if (++state.clickCount !== this._REQUIRED_CLICKS) return false;

        state.clickCount = 0; // Reset for next unique sequence.

        return true;
    }
}
