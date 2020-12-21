import { Directive, Inject, Input, ModuleWithProviders, NgModule, OnDestroy, OnInit } from '@angular/core';
import { ControlContainer, FormGroupDirective } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import set from 'lodash.set';
import { BindQueryParamsOptions, BIND_QUERY_PARAMS_OPTIONS, QueryParamDef } from './types';
import { parse, resolveParams } from './utils';

@Directive({
  selector: '[bindQueryParams]',
})
export class BindQueryParamsDirective implements OnInit, OnDestroy {
  @Input('bindQueryParams') defs: QueryParamDef[];

  private destroy = new Subject();

  constructor(
    private formGroupDirective: ControlContainer,
    @Inject(BIND_QUERY_PARAMS_OPTIONS) private options: BindQueryParamsOptions,
    private router: Router
  ) {}

  ngOnInit() {
    const queryParams = new URLSearchParams(this.options.windowRef.location.search);
    const value = {};

    for (const def of this.defs) {
      const queryKey = def.queryKey;

      if (queryParams.has(queryKey as string)) {
        set(value, def.path, parse(queryParams.get(queryKey as string), def.type));
      }
    }

    this.group!.patchValue(value);

    const onSubmitDefs = this.defs.filter((def) => def.trigger === 'submit');
    const onChangeDefs = this.defs.filter((def) => def.trigger === 'change');

    if (onSubmitDefs.length) {
      (this.formGroupDirective as FormGroupDirective).ngSubmit.pipe(takeUntil(this.destroy)).subscribe(() => {
        this.updateQueryParams(resolveParams(onSubmitDefs, this.group!.value), true);
      });
    }

    if (onChangeDefs.length) {
      this.group!.valueChanges.pipe(takeUntil(this.destroy)).subscribe((formValue) => {
        this.updateQueryParams(resolveParams(onChangeDefs, formValue));
      });
    }
  }

  get group() {
    return this.formGroupDirective.control;
  }

  ngOnDestroy() {
    this.destroy.next();
  }

  private updateQueryParams(queryParams: object, replaceUrl = false) {
    this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
}

@NgModule({
  exports: [BindQueryParamsDirective],
  declarations: [BindQueryParamsDirective],
})
export class BindQueryParamsModule {
  static forRoot(options?: BindQueryParamsOptions): ModuleWithProviders<BindQueryParamsModule> {
    return {
      ngModule: BindQueryParamsModule,
      providers: [
        {
          provide: BIND_QUERY_PARAMS_OPTIONS,
          useValue: options,
        },
      ],
    };
  }
}
