import Button from "@material-ui/core/Button";
import Collapse from "@material-ui/core/Collapse";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import Link from "@material-ui/core/Link";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Stepper from "@material-ui/core/Stepper";
import { lighten, makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import React, { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router";
import { toggleSnackbar } from "../../../../redux/explorer";
import API from "../../../../middleware/Api";
import { getNumber } from "../../../../utils";
import DomainInput from "../../Common/DomainInput";
import SizeInput from "../../Common/SizeInput";
import MagicVar from "../../Dialogs/MagicVar";

const useStyles = makeStyles((theme) => ({
    stepContent: {
        padding: "16px 32px 16px 32px",
    },
    form: {
        maxWidth: 400,
        marginTop: 20,
    },
    formContainer: {
        [theme.breakpoints.up("md")]: {
            padding: "0px 24px 0 24px",
        },
    },
    subStepContainer: {
        display: "flex",
        marginBottom: 20,
        padding: 10,
        transition: theme.transitions.create("background-color", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        "&:focus-within": {
            backgroundColor: theme.palette.background.default,
        },
    },
    stepNumber: {
        width: 20,
        height: 20,
        backgroundColor: lighten(theme.palette.secondary.light, 0.2),
        color: theme.palette.secondary.contrastText,
        textAlign: "center",
        borderRadius: " 50%",
    },
    stepNumberContainer: {
        marginRight: 10,
    },
    stepFooter: {
        marginTop: 32,
    },
    button: {
        marginRight: theme.spacing(1),
    },
    viewButtonLabel: { textTransform: "none" },
    "@global": {
        code: {
            color: "rgba(0, 0, 0, 0.87)",
            display: "inline-block",
            padding: "2px 6px",
            fontFamily:
                ' Consolas, "Liberation Mono", Menlo, Courier, monospace',
            borderRadius: "2px",
            backgroundColor: "rgba(255,229,100,0.1)",
        },
    },
}));

const steps = [
    {
        title: "存储空间",
        optional: false,
    },
    {
        title: "上传路径",
        optional: false,
    },
    {
        title: "直链设置",
        optional: false,
    },
    {
        title: "上传设置",
        optional: false,
    },
    {
        title: "跨域策略",
        optional: true,
    },
    {
        title: "完成",
        optional: false,
    },
];

export default function OSSGuide(props) {
    const classes = useStyles();
    const history = useHistory();

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [skipped, setSkipped] = React.useState(new Set());
    const [magicVar, setMagicVar] = useState("");
    const [useCDN, setUseCDN] = useState("false");
    const [useLanEndpoint, setUseLanEndpoint] = useState(
        props.policy && props.policy.OptionsSerialized.server_side_endpoint
            ? props.policy.OptionsSerialized.server_side_endpoint !== ""
            : false
    );
    const [policy, setPolicy] = useState(
        props.policy
            ? props.policy
            : {
                  Type: "oss",
                  Name: "",
                  SecretKey: "",
                  AccessKey: "",
                  BaseURL: "",
                  Server: "",
                  IsPrivate: "true",
                  DirNameRule: "uploads/{year}/{month}/{day}",
                  AutoRename: "true",
                  FileNameRule: "{randomkey8}_{originname}",
                  IsOriginLinkEnable: "false",
                  MaxSize: "0",
                  OptionsSerialized: {
                      file_type: "",
                      server_side_endpoint: "",
                      chunk_size: 25 << 20,
                      placeholder_with_size: "false",
                  },
              }
    );
    const [policyID, setPolicyID] = useState(
        props.policy ? props.policy.ID : 0
    );

    const handleChange = (name) => (event) => {
        setPolicy({
            ...policy,
            [name]: event.target.value,
        });
    };

    const handleOptionChange = (name) => (event) => {
        setPolicy({
            ...policy,
            OptionsSerialized: {
                ...policy.OptionsSerialized,
                [name]: event.target.value,
            },
        });
    };

    const isStepSkipped = (step) => {
        return skipped.has(step);
    };

    const dispatch = useDispatch();
    const ToggleSnackbar = useCallback(
        (vertical, horizontal, msg, color) =>
            dispatch(toggleSnackbar(vertical, horizontal, msg, color)),
        [dispatch]
    );

    const submitPolicy = (e) => {
        e.preventDefault();
        setLoading(true);

        const policyCopy = { ...policy };
        policyCopy.OptionsSerialized = { ...policyCopy.OptionsSerialized };

        if (useCDN === "false") {
            policyCopy.BaseURL = "";
        }

        if (!useLanEndpoint) {
            policyCopy.OptionsSerialized.server_side_endpoint = "";
        }

        // 类型转换
        policyCopy.AutoRename = policyCopy.AutoRename === "true";
        policyCopy.IsOriginLinkEnable =
            policyCopy.IsOriginLinkEnable === "true";
        policyCopy.IsPrivate = policyCopy.IsPrivate === "true";
        policyCopy.MaxSize = parseInt(policyCopy.MaxSize);
        policyCopy.OptionsSerialized.chunk_size = parseInt(
            policyCopy.OptionsSerialized.chunk_size
        );
        policyCopy.OptionsSerialized.placeholder_with_size =
            policyCopy.OptionsSerialized.placeholder_with_size === "true";
        policyCopy.OptionsSerialized.file_type = policyCopy.OptionsSerialized.file_type.split(
            ","
        );
        if (
            policyCopy.OptionsSerialized.file_type.length === 1 &&
            policyCopy.OptionsSerialized.file_type[0] === ""
        ) {
            policyCopy.OptionsSerialized.file_type = [];
        }

        API.post("/admin/policy", {
            policy: policyCopy,
        })
            .then((response) => {
                ToggleSnackbar(
                    "top",
                    "right",
                    "存储策略已" + (props.policy ? "保存" : "添加"),
                    "success"
                );
                setActiveStep(4);
                setPolicyID(response.data);
            })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            })
            .then(() => {
                setLoading(false);
            });

        setLoading(false);
    };

    const createCORS = () => {
        setLoading(true);
        API.post("/admin/policy/cors", {
            id: policyID,
        })
            .then(() => {
                ToggleSnackbar("top", "right", "跨域策略已添加", "success");
                setActiveStep(5);
            })
            .catch((error) => {
                ToggleSnackbar("top", "right", error.message, "error");
            })
            .then(() => {
                setLoading(false);
            });
    };

    return (
        <div>
            <Typography variant={"h6"}>
                {props.policy ? "修改" : "添加"} 阿里云 OSS 存储策略
            </Typography>
            <Stepper activeStep={activeStep}>
                {steps.map((label, index) => {
                    const stepProps = {};
                    const labelProps = {};
                    if (label.optional) {
                        labelProps.optional = (
                            <Typography variant="caption">可选</Typography>
                        );
                    }
                    if (isStepSkipped(index)) {
                        stepProps.completed = false;
                    }
                    return (
                        <Step key={label.title} {...stepProps}>
                            <StepLabel {...labelProps}>{label.title}</StepLabel>
                        </Step>
                    );
                })}
            </Stepper>

            {activeStep === 0 && (
                <form
                    className={classes.stepContent}
                    onSubmit={(e) => {
                        e.preventDefault();
                        setActiveStep(1);
                    }}
                >
                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>0</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                在使用 阿里云 OSS 储策略前，请确保您在 参数设置
                                - 站点信息 - 站点URL 中填写的
                                地址与实际相符，并且
                                <strong>能够被外网正常访问</strong>。
                            </Typography>
                        </div>
                    </div>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>1</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                前往
                                <Link
                                    href={
                                        "https://oss.console.aliyun.com/overview"
                                    }
                                    target={"_blank"}
                                >
                                    OSS 管理控制台
                                </Link>
                                创建 Bucket。注意：创建空间类型只能选择
                                <code>标准存储</code>或<code>低频访问</code>
                                ，暂不支持<code>归档存储</code>
                            </Typography>
                        </div>
                    </div>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>2</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                在下方填写您创建 Bucket 时指定的
                                <code>Bucket 名称</code>：
                            </Typography>
                            <div className={classes.form}>
                                <FormControl fullWidth>
                                    <InputLabel htmlFor="component-helper">
                                        Bucket 名称
                                    </InputLabel>
                                    <Input
                                        required
                                        value={policy.BucketName}
                                        onChange={handleChange("BucketName")}
                                    />
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>3</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                在下方选择您创建的空间的读写权限类型，推荐选择“私有”以获得更高的安全性，私有空间无法开启“获取直链”功能。
                            </Typography>
                            <div className={classes.form}>
                                <FormControl required component="fieldset">
                                    <RadioGroup
                                        required
                                        value={policy.IsPrivate}
                                        onChange={handleChange("IsPrivate")}
                                        row
                                    >
                                        <FormControlLabel
                                            value={"true"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="私有"
                                        />
                                        <FormControlLabel
                                            value={"false"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="公共读"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>4</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                转到所创建 Bucket 的概览页面，填写
                                <code>访问域名</code>栏目下
                                <code>外网访问</code> 一行中间的{" "}
                                <code>EndPoint（地域节点）</code>
                            </Typography>
                            <div className={classes.form}>
                                <FormControl fullWidth>
                                    <InputLabel htmlFor="component-helper">
                                        EndPoint
                                    </InputLabel>
                                    <Input
                                        required
                                        value={policy.Server}
                                        onChange={handleChange("Server")}
                                        inputProps={{
                                            pattern:
                                                "(?:(?:(?<thld>[\\w\\-]*)(?:\\.))?(?<sld>[\\w\\-]*))\\.(?<tld>[\\w\\-]*)",
                                            title:
                                                "格式不合法，只需输入域名部分即可",
                                        }}
                                    />
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>5</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                如果您的 Cloudreve
                                部署在阿里云计算服务中，并且与 OSS
                                处在同一可用区下，您可以额外指定使用内网
                                EndPoint
                                以节省流量开始。是否要在服务端发送请求时使用 OSS
                                内网 EndPoint？
                            </Typography>
                            <div className={classes.form}>
                                <FormControl required component="fieldset">
                                    <RadioGroup
                                        required
                                        value={useLanEndpoint.toString()}
                                        onChange={(e) => {
                                            setUseLanEndpoint(
                                                e.target.value === "true"
                                            );
                                        }}
                                        row
                                    >
                                        <FormControlLabel
                                            value={"true"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="使用"
                                        />
                                        <FormControlLabel
                                            value={"false"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="不使用"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </div>
                            <Collapse in={useLanEndpoint}>
                                <div className={classes.form}>
                                    <FormControl fullWidth>
                                        <InputLabel htmlFor="component-helper">
                                            内网 EndPoint
                                        </InputLabel>
                                        <Input
                                            required={useLanEndpoint}
                                            value={
                                                policy.OptionsSerialized
                                                    .server_side_endpoint
                                            }
                                            onChange={handleOptionChange(
                                                "server_side_endpoint"
                                            )}
                                            inputProps={{
                                                pattern:
                                                    "(?:(?:(?<thld>[\\w\\-]*)(?:\\.))?(?<sld>[\\w\\-]*))\\.(?<tld>[\\w\\-]*)",
                                                title:
                                                    "格式不合法，只需输入域名部分即可",
                                            }}
                                        />
                                    </FormControl>
                                </div>
                            </Collapse>
                        </div>
                    </div>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>6</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                是否要使用配套的 阿里云CDN 加速 OSS 访问？
                            </Typography>
                            <div className={classes.form}>
                                <FormControl required component="fieldset">
                                    <RadioGroup
                                        required
                                        value={useCDN}
                                        onChange={(e) => {
                                            setUseCDN(e.target.value);
                                        }}
                                        row
                                    >
                                        <FormControlLabel
                                            value={"true"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="使用"
                                        />
                                        <FormControlLabel
                                            value={"false"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="不使用"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <Collapse in={useCDN === "true"}>
                        <div className={classes.subStepContainer}>
                            <div className={classes.stepNumberContainer}>
                                <div className={classes.stepNumber}>7</div>
                            </div>
                            <div className={classes.subStepContent}>
                                <Typography variant={"body2"}>
                                    前往
                                    <Link
                                        href={
                                            "https://cdn.console.aliyun.com/domain/list"
                                        }
                                        target={"_blank"}
                                    >
                                        阿里云 CDN 管理控制台
                                    </Link>
                                    创建 CDN 加速域名，并设定源站为刚创建的 OSS
                                    Bucket。在下方填写 CDN
                                    加速域名，并选择是否使用 HTTPS：
                                </Typography>
                                <div className={classes.form}>
                                    <DomainInput
                                        value={policy.BaseURL}
                                        onChange={handleChange("BaseURL")}
                                        required={useCDN === "true"}
                                        label={"CDN 加速域名"}
                                    />
                                </div>
                            </div>
                        </div>
                    </Collapse>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>
                                {getNumber(7, [useCDN === "true"])}
                            </div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                在阿里云
                                <Link
                                    href={
                                        "https://usercenter.console.aliyun.com/#/manage/ak"
                                    }
                                    target={"_blank"}
                                >
                                    安全信息管理
                                </Link>
                                页面获取 用户 AccessKey，并填写在下方。
                            </Typography>
                            <div className={classes.form}>
                                <FormControl fullWidth>
                                    <InputLabel htmlFor="component-helper">
                                        AccessKey ID
                                    </InputLabel>
                                    <Input
                                        required
                                        inputProps={{
                                            pattern: "\\S+",
                                            title: "不能含有空格",
                                        }}
                                        value={policy.AccessKey}
                                        onChange={handleChange("AccessKey")}
                                    />
                                </FormControl>
                            </div>
                            <div className={classes.form}>
                                <FormControl fullWidth>
                                    <InputLabel htmlFor="component-helper">
                                        Access Key Secret
                                    </InputLabel>
                                    <Input
                                        required
                                        inputProps={{
                                            pattern: "\\S+",
                                            title: "不能含有空格",
                                        }}
                                        value={policy.SecretKey}
                                        onChange={handleChange("SecretKey")}
                                    />
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>
                                {getNumber(8, [useCDN === "true"])}
                            </div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                为此存储策略命名：
                            </Typography>
                            <div className={classes.form}>
                                <FormControl fullWidth>
                                    <InputLabel htmlFor="component-helper">
                                        存储策略名
                                    </InputLabel>
                                    <Input
                                        required
                                        value={policy.Name}
                                        onChange={handleChange("Name")}
                                    />
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <div className={classes.stepFooter}>
                        <Button
                            disabled={loading}
                            type={"submit"}
                            variant={"contained"}
                            color={"primary"}
                        >
                            下一步
                        </Button>
                    </div>
                </form>
            )}

            {activeStep === 1 && (
                <form
                    className={classes.stepContent}
                    onSubmit={(e) => {
                        e.preventDefault();
                        setActiveStep(2);
                    }}
                >
                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>1</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                请在下方输入文件的存储目录路径，可以为绝对路径或相对路径（相对于
                                从机的
                                Cloudreve）。路径中可以使用魔法变量，文件在上传时会自动替换这些变量为相应值；
                                可用魔法变量可参考{" "}
                                <Link
                                    color={"secondary"}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setMagicVar("path");
                                    }}
                                >
                                    路径魔法变量列表
                                </Link>{" "}
                                。
                            </Typography>
                            <div className={classes.form}>
                                <FormControl fullWidth>
                                    <InputLabel htmlFor="component-helper">
                                        存储目录
                                    </InputLabel>
                                    <Input
                                        required
                                        value={policy.DirNameRule}
                                        onChange={handleChange("DirNameRule")}
                                    />
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>2</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                是否需要对存储的物理文件进行重命名？此处的重命名不会影响最终呈现给用户的
                                文件名。文件名也可使用魔法变量，
                                可用魔法变量可参考{" "}
                                <Link
                                    color={"secondary"}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setMagicVar("file");
                                    }}
                                >
                                    文件名魔法变量列表
                                </Link>{" "}
                                。
                            </Typography>
                            <div className={classes.form}>
                                <FormControl required component="fieldset">
                                    <RadioGroup
                                        aria-label="gender"
                                        name="gender1"
                                        value={policy.AutoRename}
                                        onChange={handleChange("AutoRename")}
                                        row
                                    >
                                        <FormControlLabel
                                            value={"true"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="开启重命名"
                                        />
                                        <FormControlLabel
                                            value={"false"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="不开启"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </div>

                            <Collapse in={policy.AutoRename === "true"}>
                                <div className={classes.form}>
                                    <FormControl fullWidth>
                                        <InputLabel htmlFor="component-helper">
                                            命名规则
                                        </InputLabel>
                                        <Input
                                            required={
                                                policy.AutoRename === "true"
                                            }
                                            value={policy.FileNameRule}
                                            onChange={handleChange(
                                                "FileNameRule"
                                            )}
                                        />
                                    </FormControl>
                                </div>
                            </Collapse>
                        </div>
                    </div>

                    <div className={classes.stepFooter}>
                        <Button
                            color={"default"}
                            className={classes.button}
                            onClick={() => setActiveStep(0)}
                        >
                            上一步
                        </Button>
                        <Button
                            disabled={loading}
                            type={"submit"}
                            variant={"contained"}
                            color={"primary"}
                        >
                            下一步
                        </Button>
                    </div>
                </form>
            )}

            {activeStep === 2 && (
                <form
                    className={classes.stepContent}
                    onSubmit={(e) => {
                        e.preventDefault();
                        setActiveStep(3);
                    }}
                >
                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>1</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                是否允许获取文件永久直链？
                                <br />
                                开启后，用户可以请求获得能直接访问到文件内容的直链，适用于图床应用或自用。
                            </Typography>

                            <div className={classes.form}>
                                <FormControl required component="fieldset">
                                    <RadioGroup
                                        required
                                        value={policy.IsOriginLinkEnable}
                                        onChange={(e) => {
                                            if (
                                                policy.IsPrivate === "true" &&
                                                e.target.value === "true"
                                            ) {
                                                ToggleSnackbar(
                                                    "top",
                                                    "right",
                                                    "私有空间无法开启此功能",
                                                    "warning"
                                                );
                                                return;
                                            }
                                            handleChange("IsOriginLinkEnable")(
                                                e
                                            );
                                        }}
                                        row
                                    >
                                        <FormControlLabel
                                            value={"true"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="允许"
                                        />
                                        <FormControlLabel
                                            value={"false"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="禁止"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <div className={classes.stepFooter}>
                        <Button
                            color={"default"}
                            className={classes.button}
                            onClick={() => setActiveStep(1)}
                        >
                            上一步
                        </Button>{" "}
                        <Button
                            disabled={loading}
                            type={"submit"}
                            variant={"contained"}
                            color={"primary"}
                        >
                            下一步
                        </Button>
                    </div>
                </form>
            )}

            {activeStep === 3 && (
                <form className={classes.stepContent} onSubmit={submitPolicy}>
                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>1</div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                是否限制上传的单文件大小？
                            </Typography>

                            <div className={classes.form}>
                                <FormControl required component="fieldset">
                                    <RadioGroup
                                        required
                                        value={
                                            policy.MaxSize === "0"
                                                ? "false"
                                                : "true"
                                        }
                                        onChange={(e) => {
                                            if (e.target.value === "true") {
                                                setPolicy({
                                                    ...policy,
                                                    MaxSize: "10485760",
                                                });
                                            } else {
                                                setPolicy({
                                                    ...policy,
                                                    MaxSize: "0",
                                                });
                                            }
                                        }}
                                        row
                                    >
                                        <FormControlLabel
                                            value={"true"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="限制"
                                        />
                                        <FormControlLabel
                                            value={"false"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="不限制"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <Collapse in={policy.MaxSize !== "0"}>
                        <div className={classes.subStepContainer}>
                            <div className={classes.stepNumberContainer}>
                                <div className={classes.stepNumber}>2</div>
                            </div>
                            <div className={classes.subStepContent}>
                                <Typography variant={"body2"}>
                                    输入限制：
                                </Typography>
                                <div className={classes.form}>
                                    <SizeInput
                                        value={policy.MaxSize}
                                        onChange={handleChange("MaxSize")}
                                        min={0}
                                        max={9223372036854775807}
                                        label={"单文件大小限制"}
                                    />
                                </div>
                            </div>
                        </div>
                    </Collapse>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>
                                {policy.MaxSize !== "0" ? "3" : "2"}
                            </div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                是否限制上传文件扩展名？
                            </Typography>

                            <div className={classes.form}>
                                <FormControl required component="fieldset">
                                    <RadioGroup
                                        required
                                        value={
                                            policy.OptionsSerialized
                                                .file_type === ""
                                                ? "false"
                                                : "true"
                                        }
                                        onChange={(e) => {
                                            if (e.target.value === "true") {
                                                setPolicy({
                                                    ...policy,
                                                    OptionsSerialized: {
                                                        ...policy.OptionsSerialized,
                                                        file_type:
                                                            "jpg,png,mp4,zip,rar",
                                                    },
                                                });
                                            } else {
                                                setPolicy({
                                                    ...policy,
                                                    OptionsSerialized: {
                                                        ...policy.OptionsSerialized,
                                                        file_type: "",
                                                    },
                                                });
                                            }
                                        }}
                                        row
                                    >
                                        <FormControlLabel
                                            value={"true"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="限制"
                                        />
                                        <FormControlLabel
                                            value={"false"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="不限制"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <Collapse in={policy.OptionsSerialized.file_type !== ""}>
                        <div className={classes.subStepContainer}>
                            <div className={classes.stepNumberContainer}>
                                <div className={classes.stepNumber}>
                                    {policy.MaxSize !== "0" ? "4" : "3"}
                                </div>
                            </div>
                            <div className={classes.subStepContent}>
                                <Typography variant={"body2"}>
                                    输入允许上传的文件扩展名，多个请以半角逗号 ,
                                    隔开
                                </Typography>
                                <div className={classes.form}>
                                    <FormControl fullWidth>
                                        <InputLabel htmlFor="component-helper">
                                            扩展名列表
                                        </InputLabel>
                                        <Input
                                            value={
                                                policy.OptionsSerialized
                                                    .file_type
                                            }
                                            onChange={handleOptionChange(
                                                "file_type"
                                            )}
                                        />
                                    </FormControl>
                                </div>
                            </div>
                        </div>
                    </Collapse>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>
                                {getNumber(3, [
                                    policy.MaxSize !== "0",
                                    policy.OptionsSerialized.file_type !== "",
                                ])}
                            </div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                请指定分片上传时的分片大小，范围 100 KB ~ 5 GB。
                                <br />
                                启用分片上传后，用户上传的文件将会被切分成分片逐个上传到存储端，当上传中断后，用户可以选择从上次上传的分片后继续开始上传。
                            </Typography>
                            <div className={classes.form}>
                                <SizeInput
                                    value={policy.OptionsSerialized.chunk_size}
                                    onChange={handleOptionChange("chunk_size")}
                                    min={100 * 1024}
                                    max={5368709120}
                                    label={"分片上传大小"}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer}>
                            <div className={classes.stepNumber}>
                                {getNumber(4, [
                                    policy.MaxSize !== "0",
                                    policy.OptionsSerialized.file_type !== "",
                                ])}
                            </div>
                        </div>
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                是否要再用户开始上传时就创建占位符文件并扣除用户容量？开启后，可以防止用户恶意发起多个上传请求但不完成上传。
                            </Typography>
                            <div className={classes.form}>
                                <FormControl required component="fieldset">
                                    <RadioGroup
                                        aria-label="gender"
                                        name="gender1"
                                        value={
                                            policy.OptionsSerialized
                                                .placeholder_with_size
                                        }
                                        onChange={handleOptionChange(
                                            "placeholder_with_size"
                                        )}
                                        row
                                    >
                                        <FormControlLabel
                                            value={"true"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="创建占位符文件"
                                        />
                                        <FormControlLabel
                                            value={"false"}
                                            control={
                                                <Radio color={"primary"} />
                                            }
                                            label="不创建"
                                        />
                                    </RadioGroup>
                                </FormControl>
                            </div>
                        </div>
                    </div>

                    <div className={classes.stepFooter}>
                        <Button
                            color={"default"}
                            className={classes.button}
                            onClick={() => setActiveStep(2)}
                        >
                            上一步
                        </Button>{" "}
                        <Button
                            disabled={loading}
                            type={"submit"}
                            variant={"contained"}
                            color={"primary"}
                        >
                            下一步
                        </Button>
                    </div>
                </form>
            )}

            {activeStep === 4 && (
                <form className={classes.stepContent} onSubmit={submitPolicy}>
                    <div className={classes.subStepContainer}>
                        <div className={classes.stepNumberContainer} />
                        <div className={classes.subStepContent}>
                            <Typography variant={"body2"}>
                                OSS Bucket 需要正确配置跨域策略后才能使用 Web
                                端上传文件，Cloudreve
                                可以帮您自动设置，您也可以参考文档步骤手动设置。如果您已设置过此
                                Bucket 的跨域策略，此步骤可以跳过。
                            </Typography>
                            <div className={classes.form}>
                                <Button
                                    disabled={loading}
                                    color={"secondary"}
                                    variant={"contained"}
                                    className={classes.button}
                                    onClick={() => createCORS()}
                                    classes={{ label: classes.viewButtonLabel }}
                                >
                                    让 Cloudreve 帮我设置
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className={classes.stepFooter}>
                        <Button
                            color={"default"}
                            className={classes.button}
                            onClick={() => {
                                setActiveStep(
                                    (prevActiveStep) => prevActiveStep + 1
                                );
                                setSkipped((prevSkipped) => {
                                    const newSkipped = new Set(
                                        prevSkipped.values()
                                    );
                                    newSkipped.add(activeStep);
                                    return newSkipped;
                                });
                            }}
                        >
                            跳过
                        </Button>{" "}
                    </div>
                </form>
            )}

            {activeStep === 5 && (
                <>
                    <form className={classes.stepContent}>
                        <Typography>
                            存储策略已{props.policy ? "保存" : "添加"}！
                        </Typography>
                        <Typography variant={"body2"} color={"textSecondary"}>
                            要使用此存储策略，请到用户组管理页面，为相应用户组绑定此存储策略。
                        </Typography>
                    </form>
                    <div className={classes.stepFooter}>
                        <Button
                            color={"primary"}
                            className={classes.button}
                            onClick={() => history.push("/admin/policy")}
                        >
                            返回存储策略列表
                        </Button>
                    </div>
                </>
            )}

            <MagicVar
                open={magicVar === "file"}
                isFile
                onClose={() => setMagicVar("")}
            />
            <MagicVar
                open={magicVar === "path"}
                onClose={() => setMagicVar("")}
            />
        </div>
    );
}
