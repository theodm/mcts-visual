
export function getCurrentPlayer(state: string): 'X' | 'O' {
    // Zähle die Anzahl der X und O im aktuellen Zustand
    const xCount = (state.match(/X/g) || []).length;
    const oCount = (state.match(/O/g) || []).length;

    // Der aktuelle Spieler ist der, der weniger Züge gemacht hat
    return xCount <= oCount ? 'X' : 'O';
}

export function getResultMap(state: string): Record<'X' | 'O', number> {
    const resultMap: Record<'X' | 'O', number> = { X: 0, O: 0 };

    const winningCombinations: number[][] = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Zeilen
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Spalten
        [0, 4, 8], [2, 4, 6] // Diagonalen
    ];

    for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        
        if (state[a] !== '-' && state[a] === state[b] && state[a] === state[c]) {
            resultMap[state[a] as 'X' | 'O'] += 1;
            resultMap[state[a] === 'X' ? 'O' : 'X'] = -1;            
        }
    }

    return resultMap;
}

export function getPossibleNextStates(state: string): string[] {
    const nextStates: string[] = [];
    
    const currentPlayer = getCurrentPlayer(state);

    // Iteriere über alle Felder des Tic-Tac-Toe-Bretts
    for (let i = 0; i < state.length; i++) {
        // Wenn das Feld leer ist, füge den aktuellen Spieler hinzu
        if (state[i] === '-') {
            const nextState = state.slice(0, i) + currentPlayer + state.slice(i + 1);
            nextStates.push(nextState);
        }
    }
    
    return nextStates;
}

export function isGameOver(state: string): boolean {
    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Zeilen
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Spalten
        [0, 4, 8], [2, 4, 6] // Diagonalen
    ];

    // Überprüfen, ob ein Spieler gewonnen hat
    let playerHasWon = winningCombinations.some(combination => {
        const [a, b, c] = combination;
    
        return state[a] !== '-' && state[a] === state[b] && state[a] === state[c];
    });
    
    // Überprüfen, ob das Spielfeld voll ist
    const isFull = !state.includes('-');
    
    return playerHasWon || isFull;
}

export function isTerminal(state: string): boolean {
    // Überprüfen, ob das Spiel vorbei ist
    return isGameOver(state);
}