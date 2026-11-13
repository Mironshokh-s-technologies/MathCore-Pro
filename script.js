document.addEventListener('DOMContentLoaded', function () {
    const btnSearchPrimes = document.getElementById('btnSearchPrimes');
    const btnCalculate = document.getElementById('btnCalculate');
    const primeFromInput = document.getElementById('primeFrom');
    const primeToInput = document.getElementById('primeTo');
    const mathExprInput = document.getElementById('mathExpr');

    btnSearchPrimes.addEventListener('click', runPrimeSearch);
    btnCalculate.addEventListener('click', runCalculator);

    primeFromInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') runPrimeSearch();
    });
    primeToInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') runPrimeSearch();
    });
    mathExprInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') runCalculator();
    });
});

// ==========================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ВЫВОДА В БЛОК
// ==========================================
function renderOutput(container, badges, mainText, isCalc, isError) {
    container.innerHTML = '';

    const badgeRow = document.createElement('div');
    badgeRow.className = 'badge-row';

    badges.forEach(function (b) {
        const span = document.createElement('span');
        span.className = 'stat-badge' + (b.type ? ' ' + b.type : '');
        span.textContent = b.text;
        badgeRow.appendChild(span);
    });

    container.appendChild(badgeRow);

    const contentDiv = document.createElement('div');
    if (isCalc) {
        contentDiv.className = isError ? 'calc-answer error' : 'calc-answer';
    } else {
        contentDiv.className = 'prime-list';
    }
    contentDiv.textContent = mainText;
    container.appendChild(contentDiv);
}

// ==========================================
// 1. БЫСТРОЕ ПОБИТОВОЕ РЕШЕТО ЭРАТОСФЕНА
// ==========================================
function runPrimeSearch() {
    const fromVal = parseInt(document.getElementById('primeFrom').value, 10);
    const toVal = parseInt(document.getElementById('primeTo').value, 10);
    const resultBox = document.getElementById('primeResult');

    if (isNaN(fromVal) || isNaN(toVal) || fromVal < 0 || toVal < fromVal) {
        renderOutput(
            resultBox,
            [{ text: 'Ошибка ввода', type: 'error' }],
            'Укажите корректный диапазон: число «От» должно быть меньше или равно числу «До».',
            false,
            true
        );
        return;
    }

    if (toVal > 200000000) {
        renderOutput(
            resultBox,
            [{ text: 'Слишком большой диапазон', type: 'error' }],
            'Для мгновенного подсчёта в браузере задайте верхнюю границу до 200 000 000.',
            false,
            true
        );
        return;
    }

    const t0 = performance.now();

    const start = Math.max(2, fromVal);
    const end = toVal;
    let count = 0;
    const previewFirst = [];
    const previewLast = [];

    if (end >= 2 && start <= end) {
        const size = (end >> 1) + 1;
        const sieve = new Uint8Array((size >> 3) + 1);
        const limit = Math.floor(Math.sqrt(end));

        for (let i = 3; i <= limit; i += 2) {
            const idx = i >> 1;
            if ((sieve[idx >> 3] & (1 << (idx & 7))) === 0) {
                for (let j = i * i; j <= end; j += (i << 1)) {
                    const jIdx = j >> 1;
                    sieve[jIdx >> 3] |= (1 << (jIdx & 7));
                }
            }
        }

        if (start <= 2 && end >= 2) {
            count++;
            previewFirst.push(2);
        }

        let firstOdd = start % 2 === 0 ? start + 1 : start;
        if (firstOdd < 3) firstOdd = 3;

        for (let i = firstOdd; i <= end; i += 2) {
            const idx = i >> 1;
            if ((sieve[idx >> 3] & (1 << (idx & 7))) === 0) {
                count++;
                if (previewFirst.length < 150) {
                    previewFirst.push(i);
                } else {
                    if (previewLast.length >= 30) previewLast.shift();
                    previewLast.push(i);
                }
            }
        }
    }

    const t1 = performance.now();
    const timeMs = (t1 - t0).toFixed(2);

    let listText = '';
    if (count === 0) {
        listText = 'В указанном диапазоне простых чисел нет.';
    } else if (count <= 150) {
        listText = previewFirst.join(', ');
    } else {
        listText = 'Первые 150: ' + previewFirst.join(', ') + ' ...  |  Последние 30: ' + previewLast.join(', ');
    }

    renderOutput(
        resultBox,
        [
            { text: 'Найдено: ' + count.toLocaleString('ru-RU') + ' шт.', type: '' },
            { text: 'Время: ' + timeMs + ' мс', type: 'success' }
        ],
        listText,
        false,
        false
    );
}

// ==========================================
// 2. ТОЧНАЯ ДРОБНАЯ АРИФМЕТИКА НА BIGINT
// ==========================================
function gcdBigInt(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b > 0n) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

function makeFrac(num, den) {
    if (den === 0n) throw new Error('Деление на ноль невозможно');
    if (num === 0n) return { n: 0n, d: 1n };
    if (den < 0n) {
        num = -num;
        den = -den;
    }
    const common = gcdBigInt(num, den);
    return { n: num / common, d: den / common };
}

function parseDecimalToFrac(str) {
    const parts = str.split('.');
    if (parts.length > 2) throw new Error('Некорректная запись десятичной дроби');
    if (parts.length === 1) {
        return { n: BigInt(parts[0]), d: 1n };
    }
    const intPart = parts[0] || '0';
    const fracPart = parts[1];
    if (!fracPart) throw new Error('Некорректная запись десятичной дроби');
    const scale = 10n ** BigInt(fracPart.length);
    const num = BigInt(intPart + fracPart);
    return makeFrac(num, scale);
}

function addFrac(a, b) {
    return makeFrac(a.n * b.d + b.n * a.d, a.d * b.d);
}

function subFrac(a, b) {
    return makeFrac(a.n * b.d - b.n * a.d, a.d * b.d);
}

function mulFrac(a, b) {
    return makeFrac(a.n * b.n, a.d * b.d);
}

function divFrac(a, b) {
    if (b.n === 0n) throw new Error('Деление на ноль невозможно');
    return makeFrac(a.n * b.d, a.d * b.n);
}

function powFrac(a, b) {
    if (b.d !== 1n) throw new Error('Дробная степень не поддерживается');
    const exp = b.n;
    if (exp === 0n) return { n: 1n, d: 1n };

    let baseN = a.n;
    let baseD = a.d;
    let absExp = exp;

    if (exp < 0n) {
        if (baseN === 0n) throw new Error('Ноль нельзя возводить в отрицательную степень');
        const temp = baseN;
        baseN = baseD;
        baseD = temp;
        absExp = -exp;
    }

    // Проверка на сверхбольшое число до возведения в степень
    if (baseN > 1n || baseN < -1n) {
        const approxDigits = Number(absExp) * Math.log10(Math.abs(Number(baseN.toString().slice(0, 15))));
        if (approxDigits > 100) throw new Error('TOO_BIG');
    }
    if (baseD > 1n) {
        const approxDenDigits = Number(absExp) * Math.log10(Number(baseD.toString().slice(0, 15)));
        if (approxDenDigits > 100) throw new Error('TOO_BIG');
    }

    return makeFrac(baseN ** absExp, baseD ** absExp);
}

// Перевод точной дроби в красивую десятичную строку
function formatFractionToDecimal(frac) {
    let n = frac.n;
    const d = frac.d;
    const isNeg = n < 0n;
    if (isNeg) n = -n;

    const intPart = n / d;
    let rem = n % d;

    const intStr = intPart.toString();
    if (intStr.length > 25) {
        throw new Error('TOO_BIG');
    }

    if (rem === 0n) {
        return {
            text: (isNeg && intPart !== 0n ? '-' : '') + intStr,
            digits: intStr.length,
            isApprox: false
        };
    }

    // Максимум знаков после запятой, чтобы общее число цифр не превысило 25
    const maxDecimals = Math.max(1, 25 - intStr.length);
    let decStr = '';

    for (let i = 0; i < maxDecimals && rem > 0n; i++) {
        rem *= 10n;
        const digit = rem / d;
        decStr += digit.toString();
        rem %= d;
    }

    const isApprox = rem > 0n;
    // Убираем лишние нули на конце, если такие вдруг появились
    decStr = decStr.replace(/0+$/, '');

    const finalText = (isNeg ? '-' : '') + intStr + (decStr ? '.' + decStr : '');
    const totalDigits = intStr.length + decStr.length;

    return {
        text: finalText,
        digits: totalDigits,
        isApprox: isApprox
    };
}

// ==========================================
// 3. ПОСЛЕДНЯЯ ЦИФРА СТЕПЕНИ И ПАРСЕР
// ==========================================
function lastDigitOfPower(baseStr, expStr) {
    const base = BigInt(baseStr);
    const exp = BigInt(expStr);

    if (exp < 0n) throw new Error('Отрицательная степень не поддерживается');
    if (exp === 0n) return 1n;

    let b = ((base % 10n) + 10n) % 10n;
    let e = exp;
    let res = 1n;

    while (e > 0n) {
        if (e % 2n === 1n) {
            res = (res * b) % 10n;
        }
        b = (b * b) % 10n;
        e /= 2n;
    }
    return res;
}

function evaluateExpression(expr) {
    const clean = expr.replace(/\s+/g, '').replace(/:/g, '/').replace(/,/g, '.');
    if (!clean) throw new Error('Введите математический пример');

    if (/[^0-9.+\-*/^()]/.test(clean)) {
        throw new Error('Обнаружены недопустимые символы');
    }

    const tokens = [];
    let i = 0;
    while (i < clean.length) {
        const ch = clean[i];
        if (/[0-9.]/.test(ch)) {
            let numStr = '';
            while (i < clean.length && /[0-9.]/.test(clean[i])) {
                numStr += clean[i++];
            }
            tokens.push({ type: 'NUM', value: parseDecimalToFrac(numStr) });
        } else if ('+-*/^()'.includes(ch)) {
            const prev = tokens.at(-1);
            if ((ch === '-' || ch === '+') && (!prev || prev.type === 'OP' || prev.value === '(')) {
                if (ch === '-') {
                    tokens.push({ type: 'NUM', value: { n: 0n, d: 1n } });
                    tokens.push({ type: 'OP', value: '-' });
                }
                i++;
            } else if (ch === '(' || ch === ')') {
                tokens.push({ type: 'PAREN', value: ch });
                i++;
            } else {
                tokens.push({ type: 'OP', value: ch });
                i++;
            }
        }
    }
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
    const rightAssoc = { '^': true };
    const outputQueue = [];
    const opStack = [];
    for (const token of tokens) {
        if (token.type === 'NUM') {
            outputQueue.push(token);
        } else if (token.type === 'OP') {
            while (opStack.length > 0) {
                const top = opStack.at(-1);
                if (top.type === 'OP' && (
                    (!rightAssoc[token.value] && precedence[token.value] <= precedence[top.value]) ||
                    (rightAssoc[token.value] && precedence[token.value] < precedence[top.value])
                )) {
                    outputQueue.push(opStack.pop());
                } else {
                    break;
                }
            }
            opStack.push(token);
        } else if (token.value === '(') {
            opStack.push(token);
        } else if (token.value === ')') {
            while (opStack.length > 0 && opStack.at(-1).value !== '(') {
                outputQueue.push(opStack.pop());
            }
            if (opStack.length === 0) throw new Error('Несогласованные скобки');
            opStack.pop();
        }
    }
    while (opStack.length > 0) {
        const top = opStack.pop();
        if (top.value === '(') throw new Error('Несогласованные скобки');
        outputQueue.push(top);
    }
    const evalStack = [];
    for (const token of outputQueue) {
        if (token.type === 'NUM') {
            evalStack.push(token.value);
        } else if (token.type === 'OP') {
            if (evalStack.length < 2) throw new Error('Ошибка в записи примера');
            const b = evalStack.pop();
            const a = evalStack.pop();
            switch (token.value) {
                case '+':
                    evalStack.push(addFrac(a, b));
                    break;
                case '-':
                    evalStack.push(subFrac(a, b));
                    break;
                case '*':
                    evalStack.push(mulFrac(a, b));
                    break;
                case '/':
                    evalStack.push(divFrac(a, b));
                    break;
                case '^':
                    evalStack.push(powFrac(a, b));
                    break;
            }
        }
    }
    if (evalStack.length !== 1) throw new Error('Ошибка вычисления');
    return evalStack.pop();
}
function runCalculator() {
    const rawInput = document.getElementById('mathExpr').value.trim();
    const resultBox = document.getElementById('calcResult');
    if (!rawInput) return;
    // 1. Проверка спец-шаблона: a^bdvrvrbusk=...x
    const specialRegex = /^(-?\d+)^(\d+)dvrvrbusk=...x$/i;
    const specialMatch = rawInput.replace(/\s+/g, '').match(specialRegex);
    if (specialMatch) {
        try {
            const [, baseStr, expStr] = specialMatch;
            const lastDigit = lastDigitOfPower(baseStr, expStr);
            renderOutput(
                resultBox,
                [{ text: 'Последняя цифра степени', type: 'success' }],
                lastDigit.toString(),
                true,
                false
            );
        } catch (err) {
            renderOutput(
                resultBox,
                [{ text: 'Ошибка', type: 'error' }],
                err.message,
                true,
                true
            );
        }
        return;
    }
    // 2. Обычный или дробный пример
    try {
        const fracAnswer = evaluateExpression(rawInput);
        const formatted = formatFractionToDecimal(fracAnswer);
        const badgeText = formatted.isApprox
            ? 'Ответ (периодическая дробь)'
            : 'Точный ответ (' + formatted.digits + ' цифр)';
        renderOutput(
            resultBox,
            [{ text: badgeText, type: 'success' }],
            formatted.text,
            true,
            false
        );
    } catch (err) {
        if (err.message === 'TOO_BIG') {
            renderOutput(
                resultBox,
                [{ text: 'Превышен лимит', type: 'error' }],
                'Извините но ответ слишком большой',
                true,
                true
            );
        } else {
            renderOutput(
                resultBox,
                [{ text: 'Ошибка синтаксиса', type: 'error' }],
                err.message,
                true,
                true
            );
        }
    }
}