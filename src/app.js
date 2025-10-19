document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('dfaCanvas');
    const ctx = canvas.getContext('2d');
    const toolbar = document.getElementById('toolbar');

    let states = [];
    let transitions = [];
    let stateCounter = 0;
    const stateRadius = 30;

    let currentMode = 'move';
    let transitionStart = null;
    let selectedState = null;
    let isDragging = false;
    let dragOffsetX, dragOffsetY;

    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = Math.min(window.innerHeight * 0.6, 600);
        draw();
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    toolbar.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        
        const buttons = toolbar.querySelectorAll('.tool-btn');
        buttons.forEach(btn => btn.classList.remove('active'));

        if (e.target.id === 'exportBtn') {
            exportCanvas();
            document.getElementById(currentMode + 'Btn').classList.add('active');
        } else {
            e.target.classList.add('active');
            currentMode = e.target.id.replace('Btn', '');
            canvas.style.cursor = getCursorForMode(currentMode);
        }
    });

    function getCursorForMode(mode) {
        switch (mode) {
            case 'addState': return 'crosshair';
            case 'addTransition': return 'pointer';
            case 'setInitial':
            case 'setFinal':
            case 'delete': return 'pointer';
            case 'move': return 'grab';
            default: return 'default';
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#f9fafb";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        transitions.forEach(drawTransition);
        states.forEach(drawState);
    }

    function drawState(state) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(state.x, state.y, stateRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.stroke();

        if (state.isFinal) {
            ctx.beginPath();
            ctx.arc(state.x, state.y, stateRadius - 6, 0, Math.PI * 2);
            ctx.strokeStyle = '#4b5563';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.fillStyle = '#1f2937';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.name, state.x, state.y);

        if (state.isInitial) {
            const arrowStart = { x: state.x - stateRadius - 30, y: state.y };
            drawArrow(arrowStart.x, arrowStart.y, state.x - stateRadius, state.y, '#4b5563');
        }
        ctx.restore();
    }

    function drawTransition(transition) {
        const fromState = states.find(s => s.id === transition.from);
        const toState = states.find(s => s.id === transition.to);
        if (!fromState || !toState) return;

        ctx.save();
        ctx.strokeStyle = '#374151';
        ctx.fillStyle = '#374151';
        ctx.lineWidth = 2;

        const angle = Math.atan2(toState.y - fromState.y, toState.x - fromState.x);

        if (fromState.id === toState.id) {
            const loopRadius = stateRadius / 2;
            const loopCenterY = fromState.y - stateRadius - loopRadius;
            const loopCenterX = fromState.x;

            const startAngle = Math.PI * 0.6;
            const endAngle = Math.PI * 2.4;
            ctx.beginPath();
            ctx.arc(loopCenterX, loopCenterY, loopRadius, startAngle, endAngle);
            ctx.stroke();

            const arrowEndAngle = 0.4 * Math.PI;
            const arrowPoint = {
                x: loopCenterX + loopRadius * Math.cos(arrowEndAngle),
                y: loopCenterY + loopRadius * Math.sin(arrowEndAngle)
            };
            const tangentAngle = arrowEndAngle + Math.PI / 2;
            drawArrowhead(arrowPoint.x, arrowPoint.y, tangentAngle);

            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(transition.symbol, loopCenterX, loopCenterY - loopRadius - 4);

        } else {
            const start = {
                x: fromState.x + stateRadius * Math.cos(angle),
                y: fromState.y + stateRadius * Math.sin(angle)
            };
            const end = {
                x: toState.x - stateRadius * Math.cos(angle),
                y: toState.y - stateRadius * Math.sin(angle)
            };
            const midPoint = {
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2
            };
            const controlOffset = 30;
            let controlPoint = { x: midPoint.x, y: midPoint.y };

            const reverseExists = transitions.some(t => t.from === toState.id && t.to === fromState.id);
            if(reverseExists) {
                controlPoint.x += controlOffset * Math.sin(angle);
                controlPoint.y -= controlOffset * Math.cos(angle);
            }

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, end.x, end.y);
            ctx.stroke();

            const p1 = controlPoint;
            const p2 = end;
            const arrowAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            drawArrowhead(end.x, end.y, arrowAngle);

            const labelPos = {
                x: controlPoint.x + 15 * Math.sin(angle),
                y: controlPoint.y - 15 * Math.cos(angle)
            };

            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(transition.symbol, labelPos.x, labelPos.y);
        }
        ctx.restore();
    }

    function drawArrow(fromx, fromy, tox, toy, color) {
        const angle = Math.atan2(toy - fromy, tox - fromx);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();
        drawArrowhead(tox, toy, angle);
        ctx.restore();
    }

    function drawArrowhead(x, y, angle) {
        const headlen = 10;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    canvas.addEventListener('mousedown', (e) => {
        const pos = getMousePos(e);
        const clickedState = getStateAtPos(pos);

        switch (currentMode) {
            case 'addState':
                states.push({
                    id: stateCounter,
                    name: `q${stateCounter}`,
                    x: pos.x,
                    y: pos.y,
                    isInitial: false,
                    isFinal: false,
                });
                stateCounter++;
                break;
            
            case 'addTransition':
                if (clickedState) {
                    if (!transitionStart) transitionStart = clickedState;
                    else {
                        const symbol = prompt('Enter transition symbol(s):', 'a');
                        if (symbol) {
                            transitions.push({
                                from: transitionStart.id,
                                to: clickedState.id,
                                symbol: symbol
                            });
                        }
                        transitionStart = null;
                    }
                }
                break;
            
            case 'setInitial':
                if (clickedState) {
                    states.forEach(s => s.isInitial = (s.id === clickedState.id));
                }
                break;

            case 'setFinal':
                if (clickedState) {
                    clickedState.isFinal = !clickedState.isFinal;
                }
                break;
            
            case 'delete':
                if (clickedState) {
                    states = states.filter(s => s.id !== clickedState.id);
                    transitions = transitions.filter(t => t.from !== clickedState.id && t.to !== clickedState.id);
                }
                break;

            case 'move':
                if (clickedState) {
                    isDragging = true;
                    selectedState = clickedState;
                    dragOffsetX = pos.x - selectedState.x;
                    dragOffsetY = pos.y - selectedState.y;
                    canvas.style.cursor = 'grabbing';
                }
                break;
        }
        draw();
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && selectedState) {
            const pos = getMousePos(e);
            selectedState.x = pos.x - dragOffsetX;
            selectedState.y = pos.y - dragOffsetY;
            draw();
        }
    });

    canvas.addEventListener('mouseup', () => {
        if(isDragging) {
            isDragging = false;
            selectedState = null;
            canvas.style.cursor = getCursorForMode(currentMode);
            draw();
        }
    });

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function getStateAtPos(pos) {
        for (let i = states.length - 1; i >= 0; i--) {
            const state = states[i];
            const distance = Math.sqrt((pos.x - state.x) ** 2 + (pos.y - state.y) ** 2);
            if (distance <= stateRadius) return state;
        }
        return null;
    }

    function exportCanvas() {
        const link = document.createElement('a');
        link.download = 'automata.png';
        link.href = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        link.click();
    }
});