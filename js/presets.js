const PRESETS = [
  {
    id: 'py-assign',
    name: 'Python 基本赋值',
    language: 'python',
    code: 'a = 10\nb = a\nb = 20',
    description: '演示不可变对象：b 重新绑定不影响 a'
  },
  {
    id: 'c-pointer',
    name: 'C 指针',
    language: 'c',
    code: 'int a = 1\nint *p = &a\n*p = 2',
    description: '演示指针：通过 p 修改 a 的值'
  },
  {
    id: 'py-list',
    name: 'Python 列表',
    language: 'python',
    code: 'lst = [1, 2, 3]\nlst[0] = 99',
    description: '演示列表元素引用变更'
  },
  {
    id: 'py-2dlist',
    name: '二维列表',
    language: 'python',
    code: 'm = [[1, 2], [3, 4]]\nm[0][1] = 99',
    description: '演示嵌套列表的引用结构'
  },
  {
    id: 'py-shallow',
    name: '浅拷贝',
    language: 'python',
    code: 'a = [1, 2]\nb = a.copy()\nb[0] = 99',
    description: '浅拷贝：修改 b[0] 不影响 a[0]（int 不可变）'
  },
  {
    id: 'py-deep',
    name: '浅拷贝 vs 深拷贝',
    language: 'python',
    code: 'a = [[1, 2], [3, 4]]\nb = a.copy()\nc = deepcopy(a)\nb[0][0] = 99',
    description: '嵌套列表：浅拷贝共享内层，深拷贝完全隔离'
  }
];
