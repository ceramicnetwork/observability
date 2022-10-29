export class Utils {

  /**
   * Average array of integers
   * @param arr - Array of number
   */
  static averageArray(arr: number[]): number {

    if (arr.length == 0) {
        return 0
    }    

    return arr.reduce((total, aNumber) => total + aNumber, 0) / arr.length
  }
}
