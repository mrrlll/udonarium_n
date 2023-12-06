export enum CompareOption {
  None = 0,
  IgnoreCase = 1,
  IgnoreWidth = 2,
}

export namespace StringUtil {
  export function toHalfWidth(str: string): string {
    return str.replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  }

  export function equals(str1: string, str2: string, option: CompareOption = CompareOption.None): boolean {
    return str1.length === str2.length && (str1 === str2 || normalize(str1, option) === normalize(str2, option));
  }

  export function normalize(str: string, option: CompareOption): string {
    if (option === CompareOption.None) return str;
    let normalize = str;

    if (option & CompareOption.IgnoreCase) normalize = normalize.toLocaleLowerCase();
    if (option & CompareOption.IgnoreWidth) normalize = toHalfWidth(normalize);

    return normalize;
  }

  export function cr(str: string): string {
    if (!str) return '';
    let ret = '';
    let flg = '';
    [...str].forEach(c => {
      if (flg) {
        switch (c) {
          case 'n':
          case 'ｎ':
            ret += "\n";
            break;
          case '\\':
          case '￥':
            ret += c;
            break;
          default:
            ret += (flg + c);
        }
        flg = '';
      } else if (c == '\\' || c == '￥') {
        flg = c;
      } else {
        ret += c;
      }
    });
    return ret;
  }

  export function validUrl(url: string): boolean {
    if (!url) return false;
    try {
      new URL(url.trim());
    } catch (e) {
      return false;
    }
    return /^https?\:\/\//.test(url.trim());
  }

  export function sameOrigin(url: string): boolean {
    if (!url) return false;
    try {
      return (new URL(url)).origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  export function escapeHtml(str) {
    if(typeof str !== 'string') {
      str = str.toString();
    }
    return str.replace(/[&'`"<>]/g, function(match){
      return {
        '&': '&amp;',
        "'": '&#x27;',
        '`': '&#x60;',
        '"': '&quot;',
        '<': '&lt;',
        '>': '&gt;',
      }[match]
    });
  }

  export function rubyToHtml(str) {
    if(typeof str !== 'string') {
      str = str.toString();
    }
    return str.replace(/[\|｜]([^\|｜\s]+?)《(.+?)》/g, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>');
  }

  export function rubyToText(str) {
    if(typeof str !== 'string') {
      str = str.toString();
    }
    return str.replace(/[\|｜]([^\|｜\s]+?)《(.+?)》/g, '$1($2)');
  }

  export function aliasNameToClassName(aliasName: string) {
    switch(aliasName) {
      case 'character':
        return 'キャラクター';
      case 'cut-in':
        return 'カットイン';
      case 'dice-roll-table':
        return 'ダイスボット表';
      case 'terrain':
        return '地形';
      case 'table-mask':
        return 'マップマスク';
      case 'text-note':
        return '共有メモ';
      case 'card':
        return 'カード';
      case 'dice-symbol':
        return 'ダイスシンボル';
      case 'card-stack':
        return '山札';
      case 'game-table':
        return 'テーブル';
      case 'chat-tab':
        return 'チャットタブ';
      default:
       return aliasName;
    }
  }

  export function textShadowColor(textColor: string, lightColor='#ffffff', darkColor='#333333'): string {
    //let str = textColor && /^\#[0-9a-f]{6}$/i.test(textColor) ? '#' + (textColor.substring(1, 7).match(/.{2}/g).reduce((a, c) => { let d = (255 - parseInt(c, 16)).toString(16).toLowerCase(); return a + ('0' + d).substring(d.length - 1); }, '')) : '#ffffff';
    //console.log(str)
    //return str;
    return textColor && /^\#[0-9a-f]{6}$/i.test(textColor) ? (textColor.substring(1, 7).match(/.{2}/g).reduce((a, c) => { return a + parseInt(c, 16); }, 0) > 255 * 2 ? darkColor : lightColor) : lightColor;
  }
}
