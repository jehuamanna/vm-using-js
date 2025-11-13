/**
 * Episode 17: Standard Library Builtins
 * Builtin functions for std.math, std.array, std.str, std.io
 */

export enum BuiltinID {
  // std.math
  MATH_ABS = 0x01,
  MATH_MIN = 0x02,
  MATH_MAX = 0x03,
  MATH_SQRT = 0x04,
  MATH_POW = 0x05,
  
  // std.array
  ARRAY_LENGTH = 0x10,
  ARRAY_PUSH = 0x11,
  ARRAY_POP = 0x12,
  ARRAY_SLICE = 0x13,
  
  // std.str
  STR_LENGTH = 0x20,
  STR_CONCAT = 0x21,
  STR_CHAR_AT = 0x22,
  STR_SUBSTRING = 0x23,
  
  // std.io
  IO_READ_LINE = 0x30,
  IO_WRITE = 0x31,
}

export interface BuiltinVM {
  stack: number[];
  heap: Uint8Array;
  heapNext: number;
  inputQueue: number[];
  output: number[];
  pop: () => number;
  push: (value: number) => void;
  setHeapNext: (value: number) => void;
}

export type BuiltinFunction = (vm: BuiltinVM) => void;

/**
 * Builtin function implementations
 */
export const BUILTINS: Map<BuiltinID, BuiltinFunction> = new Map([
  // std.math.abs(x) - Returns absolute value
  [BuiltinID.MATH_ABS, (vm) => {
    const x = vm.pop();
    vm.push(x < 0 ? -x : x);
  }],
  
  // std.math.min(a, b) - Returns minimum of two values
  [BuiltinID.MATH_MIN, (vm) => {
    const b = vm.pop();
    const a = vm.pop();
    vm.push(a < b ? a : b);
  }],
  
  // std.math.max(a, b) - Returns maximum of two values
  [BuiltinID.MATH_MAX, (vm) => {
    const b = vm.pop();
    const a = vm.pop();
    vm.push(a > b ? a : b);
  }],
  
  // std.math.sqrt(x) - Returns square root (integer approximation)
  [BuiltinID.MATH_SQRT, (vm) => {
    const x = vm.pop();
    if (x < 0) {
      throw new Error('sqrt: negative number');
    }
    // Integer square root using binary search
    let low = 0;
    let high = x;
    let result = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const square = mid * mid;
      if (square === x) {
        result = mid;
        break;
      } else if (square < x) {
        result = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    vm.push(result);
  }],
  
  // std.math.pow(base, exp) - Returns base raised to exp (integer only)
  [BuiltinID.MATH_POW, (vm) => {
    const exp = vm.pop();
    const base = vm.pop();
    if (exp < 0) {
      throw new Error('pow: negative exponent not supported');
    }
    let result = 1;
    for (let i = 0; i < exp; i++) {
      result *= base;
    }
    vm.push(result);
  }],
  
  // std.array.length(arr) - Returns array length
  [BuiltinID.ARRAY_LENGTH, (vm) => {
    const arrAddr = vm.pop();
    if (arrAddr < 0 || arrAddr >= vm.heap.length - 4) {
      throw new Error('array.length: invalid array address');
    }
    // Read length from first 4 bytes
    const length = vm.heap[arrAddr] | 
                   (vm.heap[arrAddr + 1] << 8) |
                   (vm.heap[arrAddr + 2] << 16) |
                   (vm.heap[arrAddr + 3] << 24);
    vm.push(length);
  }],
  
  // std.array.push(arr, value) - Pushes value to array (returns new length)
  [BuiltinID.ARRAY_PUSH, (vm) => {
    const value = vm.pop();
    const arrAddr = vm.pop();
    if (arrAddr < 0 || arrAddr >= vm.heap.length - 4) {
      throw new Error('array.push: invalid array address');
    }
    // Read current length
    const length = vm.heap[arrAddr] | 
                   (vm.heap[arrAddr + 1] << 8) |
                   (vm.heap[arrAddr + 2] << 16) |
                   (vm.heap[arrAddr + 3] << 24);
    // Calculate new element address
    const elementAddr = arrAddr + 4 + (length * 4);
    if (elementAddr + 4 > vm.heap.length) {
      throw new Error('array.push: heap overflow');
    }
    // Store new value
    vm.heap[elementAddr] = value & 0xFF;
    vm.heap[elementAddr + 1] = (value >> 8) & 0xFF;
    vm.heap[elementAddr + 2] = (value >> 16) & 0xFF;
    vm.heap[elementAddr + 3] = (value >> 24) & 0xFF;
    // Update length
    const newLength = length + 1;
    vm.heap[arrAddr] = newLength & 0xFF;
    vm.heap[arrAddr + 1] = (newLength >> 8) & 0xFF;
    vm.heap[arrAddr + 2] = (newLength >> 16) & 0xFF;
    vm.heap[arrAddr + 3] = (newLength >> 24) & 0xFF;
    vm.push(newLength);
  }],
  
  // std.array.pop(arr) - Pops and returns last element
  [BuiltinID.ARRAY_POP, (vm) => {
    const arrAddr = vm.pop();
    if (arrAddr < 0 || arrAddr >= vm.heap.length - 4) {
      throw new Error('array.pop: invalid array address');
    }
    // Read current length
    const length = vm.heap[arrAddr] | 
                   (vm.heap[arrAddr + 1] << 8) |
                   (vm.heap[arrAddr + 2] << 16) |
                   (vm.heap[arrAddr + 3] << 24);
    if (length === 0) {
      throw new Error('array.pop: empty array');
    }
    // Read last element
    const elementAddr = arrAddr + 4 + ((length - 1) * 4);
    const value = vm.heap[elementAddr] |
                  (vm.heap[elementAddr + 1] << 8) |
                  (vm.heap[elementAddr + 2] << 16) |
                  (vm.heap[elementAddr + 3] << 24);
    // Update length
    const newLength = length - 1;
    vm.heap[arrAddr] = newLength & 0xFF;
    vm.heap[arrAddr + 1] = (newLength >> 8) & 0xFF;
    vm.heap[arrAddr + 2] = (newLength >> 16) & 0xFF;
    vm.heap[arrAddr + 3] = (newLength >> 24) & 0xFF;
    vm.push(value);
  }],
  
  // std.array.slice(arr, start, end) - Returns new array slice
  [BuiltinID.ARRAY_SLICE, (vm) => {
    const end = vm.pop();
    const start = vm.pop();
    const arrAddr = vm.pop();
    if (arrAddr < 0 || arrAddr >= vm.heap.length - 4) {
      throw new Error('array.slice: invalid array address');
    }
    // Read array length
    const length = vm.heap[arrAddr] | 
                   (vm.heap[arrAddr + 1] << 8) |
                   (vm.heap[arrAddr + 2] << 16) |
                   (vm.heap[arrAddr + 3] << 24);
    if (start < 0 || start > length || end < start || end > length) {
      throw new Error('array.slice: invalid indices');
    }
    const sliceLength = end - start;
    // Allocate new array (4 bytes for length + elements)
    const newArrAddr = vm.heapNext;
    const newArrSize = 4 + (sliceLength * 4);
    if (vm.heapNext + newArrSize > vm.heap.length) {
      throw new Error('array.slice: heap overflow');
    }
    // Write length
    vm.heap[vm.heapNext] = sliceLength & 0xFF;
    vm.heap[vm.heapNext + 1] = (sliceLength >> 8) & 0xFF;
    vm.heap[vm.heapNext + 2] = (sliceLength >> 16) & 0xFF;
    vm.heap[vm.heapNext + 3] = (sliceLength >> 24) & 0xFF;
    // Copy elements
    for (let i = 0; i < sliceLength; i++) {
      const srcAddr = arrAddr + 4 + ((start + i) * 4);
      const dstAddr = vm.heapNext + 4 + (i * 4);
      vm.heap[dstAddr] = vm.heap[srcAddr];
      vm.heap[dstAddr + 1] = vm.heap[srcAddr + 1];
      vm.heap[dstAddr + 2] = vm.heap[srcAddr + 2];
      vm.heap[dstAddr + 3] = vm.heap[srcAddr + 3];
    }
    vm.setHeapNext(vm.heapNext + newArrSize);
    vm.push(newArrAddr);
  }],
  
  // std.str.length(str) - Returns string length
  [BuiltinID.STR_LENGTH, (vm) => {
    const strAddr = vm.pop();
    if (strAddr < 0 || strAddr >= vm.heap.length - 4) {
      throw new Error('str.length: invalid string address');
    }
    // Read length from first 4 bytes
    const length = vm.heap[strAddr] | 
                   (vm.heap[strAddr + 1] << 8) |
                   (vm.heap[strAddr + 2] << 16) |
                   (vm.heap[strAddr + 3] << 24);
    vm.push(length);
  }],
  
  // std.str.concat(a, b) - Concatenates two strings, returns new string
  [BuiltinID.STR_CONCAT, (vm) => {
    const bAddr = vm.pop();
    const aAddr = vm.pop();
    if (aAddr < 0 || aAddr >= vm.heap.length - 4 || bAddr < 0 || bAddr >= vm.heap.length - 4) {
      throw new Error('str.concat: invalid string address');
    }
    // Read lengths
    const aLength = vm.heap[aAddr] | 
                    (vm.heap[aAddr + 1] << 8) |
                    (vm.heap[aAddr + 2] << 16) |
                    (vm.heap[aAddr + 3] << 24);
    const bLength = vm.heap[bAddr] | 
                    (vm.heap[bAddr + 1] << 8) |
                    (vm.heap[bAddr + 2] << 16) |
                    (vm.heap[bAddr + 3] << 24);
    const totalLength = aLength + bLength;
    // Allocate new string
    const newStrAddr = vm.heapNext;
    const newStrSize = 4 + totalLength + 1; // length + chars + null terminator
    if (vm.heapNext + newStrSize > vm.heap.length) {
      throw new Error('str.concat: heap overflow');
    }
    // Write length
    vm.heap[vm.heapNext] = totalLength & 0xFF;
    vm.heap[vm.heapNext + 1] = (totalLength >> 8) & 0xFF;
    vm.heap[vm.heapNext + 2] = (totalLength >> 16) & 0xFF;
    vm.heap[vm.heapNext + 3] = (totalLength >> 24) & 0xFF;
    // Copy first string
    for (let i = 0; i < aLength; i++) {
      vm.heap[vm.heapNext + 4 + i] = vm.heap[aAddr + 4 + i];
    }
    // Copy second string
    for (let i = 0; i < bLength; i++) {
      vm.heap[vm.heapNext + 4 + aLength + i] = vm.heap[bAddr + 4 + i];
    }
    // Add null terminator
    vm.heap[vm.heapNext + 4 + totalLength] = 0;
    vm.setHeapNext(vm.heapNext + newStrSize);
    vm.push(newStrAddr);
  }],
  
  // std.str.charAt(str, index) - Returns character at index (as ASCII code)
  [BuiltinID.STR_CHAR_AT, (vm) => {
    const index = vm.pop();
    const strAddr = vm.pop();
    if (strAddr < 0 || strAddr >= vm.heap.length - 4) {
      throw new Error('str.charAt: invalid string address');
    }
    // Read length
    const length = vm.heap[strAddr] | 
                   (vm.heap[strAddr + 1] << 8) |
                   (vm.heap[strAddr + 2] << 16) |
                   (vm.heap[strAddr + 3] << 24);
    if (index < 0 || index >= length) {
      throw new Error('str.charAt: index out of bounds');
    }
    const charCode = vm.heap[strAddr + 4 + index];
    vm.push(charCode);
  }],
  
  // std.str.substring(str, start, end) - Returns new substring
  [BuiltinID.STR_SUBSTRING, (vm) => {
    const end = vm.pop();
    const start = vm.pop();
    const strAddr = vm.pop();
    if (strAddr < 0 || strAddr >= vm.heap.length - 4) {
      throw new Error('str.substring: invalid string address');
    }
    // Read length
    const length = vm.heap[strAddr] | 
                   (vm.heap[strAddr + 1] << 8) |
                   (vm.heap[strAddr + 2] << 16) |
                   (vm.heap[strAddr + 3] << 24);
    if (start < 0 || start > length || end < start || end > length) {
      throw new Error('str.substring: invalid indices');
    }
    const subLength = end - start;
    // Allocate new string
    const newStrAddr = vm.heapNext;
    const newStrSize = 4 + subLength + 1; // length + chars + null terminator
    if (vm.heapNext + newStrSize > vm.heap.length) {
      throw new Error('str.substring: heap overflow');
    }
    // Write length
    vm.heap[vm.heapNext] = subLength & 0xFF;
    vm.heap[vm.heapNext + 1] = (subLength >> 8) & 0xFF;
    vm.heap[vm.heapNext + 2] = (subLength >> 16) & 0xFF;
    vm.heap[vm.heapNext + 3] = (subLength >> 24) & 0xFF;
    // Copy substring
    for (let i = 0; i < subLength; i++) {
      vm.heap[vm.heapNext + 4 + i] = vm.heap[strAddr + 4 + start + i];
    }
    // Add null terminator
    vm.heap[vm.heapNext + 4 + subLength] = 0;
    vm.setHeapNext(vm.heapNext + newStrSize);
    vm.push(newStrAddr);
  }],
  
  // std.io.readLine() - Reads a line from input (returns string address)
  // For now, reads a single number and converts to string
  [BuiltinID.IO_READ_LINE, (vm) => {
    if (vm.inputQueue.length === 0) {
      throw new Error('io.readLine: no input available');
    }
    const value = vm.inputQueue.shift()!;
    // Convert number to string (simplified - just the number as ASCII)
    const str = value.toString();
    const length = str.length;
    // Allocate new string
    const newStrAddr = vm.heapNext;
    const newStrSize = 4 + length + 1; // length + chars + null terminator
    if (vm.heapNext + newStrSize > vm.heap.length) {
      throw new Error('io.readLine: heap overflow');
    }
    // Write length
    vm.heap[vm.heapNext] = length & 0xFF;
    vm.heap[vm.heapNext + 1] = (length >> 8) & 0xFF;
    vm.heap[vm.heapNext + 2] = (length >> 16) & 0xFF;
    vm.heap[vm.heapNext + 3] = (length >> 24) & 0xFF;
    // Write characters
    for (let i = 0; i < length; i++) {
      vm.heap[vm.heapNext + 4 + i] = str.charCodeAt(i);
    }
    // Add null terminator
    vm.heap[vm.heapNext + 4 + length] = 0;
    vm.setHeapNext(vm.heapNext + newStrSize);
    vm.push(newStrAddr);
  }],
  
  // std.io.write(str) - Writes string to output (prints each character)
  [BuiltinID.IO_WRITE, (vm) => {
    const strAddr = vm.pop();
    if (strAddr < 0 || strAddr >= vm.heap.length - 4) {
      throw new Error('io.write: invalid string address');
    }
    // Read length
    const length = vm.heap[strAddr] | 
                   (vm.heap[strAddr + 1] << 8) |
                   (vm.heap[strAddr + 2] << 16) |
                   (vm.heap[strAddr + 3] << 24);
    // Print each character as its ASCII code
    for (let i = 0; i < length; i++) {
      const charCode = vm.heap[strAddr + 4 + i];
      vm.output.push(charCode);
    }
  }],
]);

/**
 * Map from full builtin name (e.g., "std.math.abs") to BuiltinID
 */
export const BUILTIN_NAME_MAP: Map<string, BuiltinID> = new Map([
  // std.math
  ['std.math.abs', BuiltinID.MATH_ABS],
  ['std.math.min', BuiltinID.MATH_MIN],
  ['std.math.max', BuiltinID.MATH_MAX],
  ['std.math.sqrt', BuiltinID.MATH_SQRT],
  ['std.math.pow', BuiltinID.MATH_POW],
  
  // std.array
  ['std.array.length', BuiltinID.ARRAY_LENGTH],
  ['std.array.push', BuiltinID.ARRAY_PUSH],
  ['std.array.pop', BuiltinID.ARRAY_POP],
  ['std.array.slice', BuiltinID.ARRAY_SLICE],
  
  // std.str
  ['std.str.length', BuiltinID.STR_LENGTH],
  ['std.str.concat', BuiltinID.STR_CONCAT],
  ['std.str.charAt', BuiltinID.STR_CHAR_AT],
  ['std.str.substring', BuiltinID.STR_SUBSTRING],
  
  // std.io
  ['std.io.readLine', BuiltinID.IO_READ_LINE],
  ['std.io.write', BuiltinID.IO_WRITE],
]);

