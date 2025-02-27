import {
    OneDriveError,
    Policy,
    QiniuError,
    Response,
    UpyunError,
} from "../types";
import { sizeToString } from "../utils";

export enum UploaderErrorName {
    InvalidFile = "InvalidFile",
    NoPolicySelected = "NoPolicySelected",
    UnknownPolicyType = "UnknownPolicyType",
    FailedCreateUploadSession = "FailedCreateUploadSession",
    FailedDeleteUploadSession = "FailedDeleteUploadSession",
    HTTPRequestFailed = "HTTPRequestFailed",
    LocalChunkUploadFailed = "LocalChunkUploadFailed",
    SlaveChunkUploadFailed = "SlaveChunkUploadFailed",
    WriteCtxFailed = "WriteCtxFailed",
    RemoveCtxFailed = "RemoveCtxFailed",
    ReadCtxFailed = "ReadCtxFailed",
    InvalidCtxData = "InvalidCtxData",
    CtxExpired = "CtxExpired",
    RequestCanceled = "RequestCanceled",
    ProcessingTaskDuplicated = "ProcessingTaskDuplicated",
    OneDriveChunkUploadFailed = "OneDriveChunkUploadFailed",
    OneDriveEmptyFile = "OneDriveEmptyFile",
    FailedFinishOneDriveUpload = "FailedFinishOneDriveUpload",
    S3LikeChunkUploadFailed = "S3LikeChunkUploadFailed",
    S3LikeUploadCallbackFailed = "S3LikeUploadCallbackFailed",
    COSUploadCallbackFailed = "COSUploadCallbackFailed",
    COSPostUploadFailed = "COSPostUploadFailed",
    UpyunPostUploadFailed = "UpyunPostUploadFailed",
    QiniuChunkUploadFailed = "QiniuChunkUploadFailed",
    FailedFinishOSSUpload = "FailedFinishOSSUpload",
    FailedFinishQiniuUpload = "FailedFinishQiniuUpload",
    FailedTransformResponse = "FailedTransformResponse",
}

const RETRY_ERROR_LIST = [
    UploaderErrorName.FailedCreateUploadSession,
    UploaderErrorName.HTTPRequestFailed,
    UploaderErrorName.LocalChunkUploadFailed,
    UploaderErrorName.SlaveChunkUploadFailed,
    UploaderErrorName.RequestCanceled,
    UploaderErrorName.ProcessingTaskDuplicated,
    UploaderErrorName.FailedTransformResponse,
];

const RETRY_CODE_LIST = [-1];

export class UploaderError implements Error {
    public stack: string | undefined;
    constructor(public name: UploaderErrorName, public message: string) {
        this.stack = new Error().stack;
    }

    public Message(i18n: string): string {
        return this.message;
    }

    public Retryable(): boolean {
        return RETRY_ERROR_LIST.includes(this.name);
    }
}

// 文件未通过存储策略验证
export class FileValidateError extends UploaderError {
    // 未通过验证的文件属性
    public field: "size" | "suffix";

    // 对应的存储策略
    public policy: Policy;

    constructor(message: string, field: "size" | "suffix", policy: Policy) {
        super(UploaderErrorName.InvalidFile, message);
        this.field = field;
        this.policy = policy;
    }

    public Message(i18n: string): string {
        if (this.field == "size") {
            return `文件大小超出存储策略限制（最大：${sizeToString(
                this.policy.maxSize
            )}）`;
        }

        return `存储策略不支持上传此扩展名的文件（当前支持：${
            this.policy.allowedSuffix
                ? this.policy.allowedSuffix.join(",")
                : "*"
        }）`;
    }
}

// 未知存储策略
export class UnknownPolicyError extends UploaderError {
    // 对应的存储策略
    public policy: Policy;

    constructor(message: string, policy: Policy) {
        super(UploaderErrorName.UnknownPolicyType, message);
        this.policy = policy;
    }
}

// 后端 API 出错
export class APIError extends UploaderError {
    constructor(
        name: UploaderErrorName,
        message: string,
        protected response: Response<any>
    ) {
        super(name, message);
    }

    public Message(i18n: string): string {
        let msg = `${this.message}: ${this.response.msg}`;
        if (this.response.error) {
            msg += ` (${this.response.error})`;
        }

        return msg;
    }

    public Retryable(): boolean {
        return (
            super.Retryable() && RETRY_CODE_LIST.includes(this.response.code)
        );
    }
}

// 无法创建上传会话
export class CreateUploadSessionError extends APIError {
    constructor(response: Response<any>) {
        super(UploaderErrorName.FailedCreateUploadSession, "", response);
    }

    public Message(i18n: string): string {
        this.message = "无法创建上传会话";
        return super.Message(i18n);
    }
}

// 无法删除上传会话
export class DeleteUploadSessionError extends APIError {
    constructor(response: Response<any>) {
        super(UploaderErrorName.FailedDeleteUploadSession, "", response);
    }

    public Message(i18n: string): string {
        this.message = "无法删除上传会话";
        return super.Message(i18n);
    }
}

// HTTP 请求出错
export class HTTPError extends UploaderError {
    public response?: any;
    constructor(public axiosErr: any, protected url: string) {
        super(UploaderErrorName.HTTPRequestFailed, axiosErr.message);
        this.response = axiosErr.response;
    }

    public Message(i18n: string): string {
        return `请求失败: ${this.axiosErr} (${this.url})`;
    }
}

// 本地分块上传失败
export class LocalChunkUploadError extends APIError {
    constructor(response: Response<any>, protected chunkIndex: number) {
        super(UploaderErrorName.LocalChunkUploadFailed, "", response);
    }

    public Message(i18n: string): string {
        this.message = `分片 [${this.chunkIndex}] 上传失败`;
        return super.Message(i18n);
    }
}

// 无法创建上传会话
export class RequestCanceledError extends UploaderError {
    constructor() {
        super(UploaderErrorName.RequestCanceled, "Request canceled");
    }
}

// 从机分块上传失败
export class SlaveChunkUploadError extends APIError {
    constructor(response: Response<any>, protected chunkIndex: number) {
        super(UploaderErrorName.SlaveChunkUploadFailed, "", response);
    }

    public Message(i18n: string): string {
        this.message = `分片 [${this.chunkIndex}] 上传失败`;
        return super.Message(i18n);
    }
}

// 上传任务冲突
export class ProcessingTaskDuplicatedError extends UploaderError {
    constructor() {
        super(
            UploaderErrorName.ProcessingTaskDuplicated,
            "Processing task duplicated"
        );
    }

    public Message(i18n: string): string {
        return "同名文件的上传任务已经在处理中";
    }
}

// OneDrive 分块上传失败
export class OneDriveChunkError extends UploaderError {
    constructor(public response: OneDriveError) {
        super(
            UploaderErrorName.OneDriveChunkUploadFailed,
            response.error.message
        );
    }

    public Message(i18n: string): string {
        return `分片上传失败: ${this.message}`;
    }
}

// OneDrive 选择了空文件上传
export class OneDriveEmptyFileSelected extends UploaderError {
    constructor() {
        super(UploaderErrorName.OneDriveEmptyFile, "empty file not supported");
    }

    public Message(i18n: string): string {
        return `暂不支持上传空文件至 OneDrive，请通过创建文件按钮创建空文件`;
    }
}

// OneDrive 无法完成文件上传
export class OneDriveFinishUploadError extends APIError {
    constructor(response: Response<any>) {
        super(UploaderErrorName.FailedFinishOneDriveUpload, "", response);
    }

    public Message(i18n: string): string {
        this.message = `无法完成文件上传`;
        return super.Message(i18n);
    }
}

// S3 类策略分块上传失败
export class S3LikeChunkError extends UploaderError {
    constructor(public response: Document) {
        super(
            UploaderErrorName.S3LikeChunkUploadFailed,
            response.getElementsByTagName("Message")[0].innerHTML
        );
    }

    public Message(i18n: string): string {
        return `分片上传失败: ${this.message}`;
    }
}

// OSS 完成传失败
export class S3LikeFinishUploadError extends UploaderError {
    constructor(public response: Document) {
        super(
            UploaderErrorName.S3LikeChunkUploadFailed,
            response.getElementsByTagName("Message")[0].innerHTML
        );
    }

    public Message(i18n: string): string {
        return `无法完成文件上传: ${this.message} (${
            this.response.getElementsByTagName("Code")[0].innerHTML
        })`;
    }
}

// qiniu 分块上传失败
export class QiniuChunkError extends UploaderError {
    constructor(public response: QiniuError) {
        super(UploaderErrorName.QiniuChunkUploadFailed, response.error);
    }

    public Message(i18n: string): string {
        return `分片上传失败: ${this.message}`;
    }
}

// qiniu 完成传失败
export class QiniuFinishUploadError extends UploaderError {
    constructor(public response: QiniuError) {
        super(UploaderErrorName.FailedFinishQiniuUpload, response.error);
    }

    public Message(i18n: string): string {
        return `无法完成文件上传: ${this.message}`;
    }
}

// COS 上传失败
export class COSUploadError extends UploaderError {
    constructor(public response: Document) {
        super(
            UploaderErrorName.COSPostUploadFailed,
            response.getElementsByTagName("Message")[0].innerHTML
        );
    }

    public Message(i18n: string): string {
        return `上传失败: ${this.message} (${
            this.response.getElementsByTagName("Code")[0].innerHTML
        })`;
    }
}

// COS 无法完成上传回调
export class COSUploadCallbackError extends APIError {
    constructor(response: Response<any>) {
        super(UploaderErrorName.COSUploadCallbackFailed, "", response);
    }

    public Message(i18n: string): string {
        this.message = `无法完成文件上传`;
        return super.Message(i18n);
    }
}

// Upyun 上传失败
export class UpyunUploadError extends UploaderError {
    constructor(public response: UpyunError) {
        super(UploaderErrorName.UpyunPostUploadFailed, response.message);
    }

    public Message(i18n: string): string {
        return `上传失败: ${this.message}`;
    }
}

// S3 无法完成上传回调
export class S3LikeUploadCallbackError extends APIError {
    constructor(response: Response<any>) {
        super(UploaderErrorName.S3LikeUploadCallbackFailed, "", response);
    }

    public Message(i18n: string): string {
        this.message = `无法完成文件上传`;
        return super.Message(i18n);
    }
}

// 无法解析响应
export class TransformResponseError extends UploaderError {
    constructor(private response: string, parseError: Error) {
        super(UploaderErrorName.FailedTransformResponse, parseError.message);
    }

    public Message(i18n: string): string {
        return `无法解析响应: ${this.message} (${this.response})`;
    }
}
